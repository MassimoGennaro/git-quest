// engine/commands/rebase.ts — git rebase command handler

import type { CommandHandler, RepoState } from '../types';
import { resolveHead, updateHeadCommit } from '../refs';
import { createCommit, addCommitToStore, getCommit } from '../store';
import {
  isAncestor,
  findCommonAncestor,
  detectConflicts,
  mergeTreesClean,
  getCommitChain,
} from '../mergeUtils';

/**
 * git rebase <branch>           — replay current branch's commits on top of <branch>
 * git rebase -i HEAD~N          — interactive rebase (signals UI to open picker)
 *
 * Regular rebase:
 *   Finds the common ancestor, then replays commits from current branch on top
 *   of the target branch. Each commit is applied as a cherry-pick.
 *
 * Interactive rebase:
 *   Returns a RebaseInteractiveInfo so the UI can show a pick/squash/drop picker.
 *   The actual replay is handled by `rebaseApply` (called by the UI after user picks).
 */
export const rebase: CommandHandler = (args, flags, state) => {
  const isInteractive = flags['i'] === true;

  if (isInteractive) {
    return handleInteractiveRebase(args, state);
  }

  return handleRegularRebase(args, state);
};

/**
 * Regular rebase: replay current branch commits on top of target branch.
 */
function handleRegularRebase(
  args: string[],
  state: RepoState,
): import('../types').CommandResult {
  if (args.length === 0) {
    return {
      success: false,
      output: 'fatal: No upstream branch specified. Usage: git rebase <branch>',
      newState: state,
    };
  }

  if (state.head.type !== 'branch') {
    return {
      success: false,
      output: 'fatal: Cannot rebase in detached HEAD state.',
      newState: state,
    };
  }

  const targetBranch = args[0]!;
  if (!(targetBranch in state.branches)) {
    return {
      success: false,
      output: `fatal: invalid upstream '${targetBranch}'`,
      newState: state,
    };
  }

  const currentBranch = state.head.name;
  const currentHash = state.branches[currentBranch]!;
  const targetHash = state.branches[targetBranch]!;

  // Already up to date
  if (currentHash === targetHash) {
    return {
      success: true,
      output: `Current branch ${currentBranch} is up to date.`,
      newState: state,
    };
  }

  // If current is already on top of target, nothing to do
  if (isAncestor(state, targetHash, currentHash)) {
    // Check if target is also ancestor of current — already linear
    const ancestor = findCommonAncestor(state, currentHash, targetHash);
    if (ancestor === targetHash) {
      return {
        success: true,
        output: `Current branch ${currentBranch} is up to date.`,
        newState: state,
      };
    }
  }

  // Fast-forward: if current is ancestor of target, just move the pointer
  if (isAncestor(state, currentHash, targetHash)) {
    const newState: RepoState = {
      ...state,
      branches: {
        ...state.branches,
        [currentBranch]: targetHash,
      },
      reflog: [
        {
          hash: targetHash,
          description: `rebase (finish): ${currentBranch} onto ${targetBranch}`,
        },
        ...state.reflog,
      ],
    };
    return {
      success: true,
      output: `Successfully rebased and updated refs/heads/${currentBranch}.`,
      newState,
    };
  }

  // Find common ancestor
  const ancestorHash = findCommonAncestor(state, currentHash, targetHash);
  if (!ancestorHash) {
    return {
      success: false,
      output: 'fatal: refusing to rebase unrelated histories.',
      newState: state,
    };
  }

  // Get the chain of commits to replay (from ancestor to current, exclusive of ancestor)
  const commitsToReplay = getCommitChain(state, ancestorHash, currentHash);

  if (commitsToReplay.length === 0) {
    return {
      success: true,
      output: `Current branch ${currentBranch} is up to date.`,
      newState: state,
    };
  }

  // Replay each commit on top of target
  let newState = state;
  let baseHash = targetHash;

  for (const commitHash of commitsToReplay) {
    const originalCommit = getCommit(state, commitHash);
    if (!originalCommit) {
      return {
        success: false,
        output: `fatal: corrupt commit ${commitHash}`,
        newState: state,
      };
    }

    // Get parent tree for this commit
    let parentTree = {};
    if (originalCommit.parentHashes.length > 0) {
      const parentCommit = getCommit(state, originalCommit.parentHashes[0]!);
      if (parentCommit) {
        parentTree = parentCommit.tree;
      }
    }

    // Get the current base tree
    const baseCommit = getCommit(newState, baseHash);
    if (!baseCommit) {
      return {
        success: false,
        output: 'fatal: corrupt repository state during rebase.',
        newState: state,
      };
    }

    // Detect conflicts
    const conflicts = detectConflicts(
      parentTree,
      baseCommit.tree,
      originalCommit.tree,
    );

    if (Object.keys(conflicts).length > 0) {
      // For simplicity in the game, report the conflict and stop
      const conflictedFiles: RepoState['workingTree']['files'] = {};
      const conflictSet: Record<
        string,
        { ours: string; theirs: string; ancestor: string }
      > = {};

      for (const [filename, conflict] of Object.entries(conflicts)) {
        conflictedFiles[filename] = {
          status: 'conflicted',
          content: '',
          conflictOurs: conflict.ours,
          conflictTheirs: conflict.theirs,
          conflictAncestor: conflict.ancestor,
        };
        conflictSet[filename] = conflict;
      }

      const conflictState: RepoState = {
        ...newState,
        workingTree: {
          files: {
            ...newState.workingTree.files,
            ...conflictedFiles,
          },
        },
      };

      const conflictNames = Object.keys(conflicts).join(', ');
      return {
        success: false,
        output: `CONFLICT (content): Merge conflict in ${conflictNames}\nResolve all conflicts and then run "git rebase --continue".`,
        newState: conflictState,
        conflictsTriggered: conflictSet,
      };
    }

    // Apply cleanly
    const mergedTree = mergeTreesClean(
      parentTree,
      baseCommit.tree,
      originalCommit.tree,
    );

    const timestamp = Date.now() + commitsToReplay.indexOf(commitHash);
    const newCommit = createCommit(
      originalCommit.message,
      [baseHash],
      mergedTree,
      timestamp,
    );

    newState = addCommitToStore(newState, newCommit);
    baseHash = newCommit.hash;
  }

  // Move the current branch to the new tip
  newState = {
    ...newState,
    branches: {
      ...newState.branches,
      [currentBranch]: baseHash,
    },
    reflog: [
      {
        hash: baseHash,
        description: `rebase (finish): ${currentBranch} onto ${targetBranch}`,
      },
      ...state.reflog,
    ],
  };

  return {
    success: true,
    output: `Successfully rebased and updated refs/heads/${currentBranch}.`,
    newState,
  };
}

/**
 * Interactive rebase: signal the UI to show a commit picker.
 * Supports: git rebase -i HEAD~N
 */
function handleInteractiveRebase(
  args: string[],
  state: RepoState,
): import('../types').CommandResult {
  if (args.length === 0) {
    return {
      success: false,
      output:
        'fatal: No target specified. Usage: git rebase -i HEAD~N',
      newState: state,
    };
  }

  const target = args[0]!;
  const headHash = resolveHead(state);
  if (!headHash) {
    return {
      success: false,
      output: 'fatal: no commits yet.',
      newState: state,
    };
  }

  // Resolve HEAD~N
  const match = target.match(/^HEAD~(\d+)$/);
  if (!match) {
    return {
      success: false,
      output: `fatal: invalid upstream '${target}'. Use HEAD~N format for interactive rebase.`,
      newState: state,
    };
  }

  const n = parseInt(match[1]!, 10);
  if (n <= 0) {
    return {
      success: false,
      output: 'fatal: nothing to rebase.',
      newState: state,
    };
  }

  // Walk back N commits to find the "onto" point
  let ontoHash = headHash;
  for (let i = 0; i < n; i++) {
    const commit = getCommit(state, ontoHash);
    if (!commit || commit.parentHashes.length === 0) {
      return {
        success: false,
        output: `fatal: invalid upstream '${target}': not enough commits.`,
        newState: state,
      };
    }
    ontoHash = commit.parentHashes[0]!;
  }

  // Collect the commits to be rebased (oldest first)
  const commits = getCommitChain(state, ontoHash, headHash);
  const commitInfos = commits.map((hash) => {
    const c = getCommit(state, hash);
    return { hash, message: c?.message ?? '' };
  });

  return {
    success: true,
    output: 'Interactive rebase started. Pick, squash, or drop commits.',
    newState: state,
    rebaseInteractive: {
      commits: commitInfos,
      ontoHash,
    },
  };
}

/**
 * Apply the result of an interactive rebase.
 * Called by the UI after the user has chosen pick/squash/drop for each commit.
 *
 * This is a pure function exported for use by the game engine hooks.
 */
export function rebaseApply(
  state: RepoState,
  ontoHash: string,
  actions: Array<{
    hash: string;
    action: 'pick' | 'squash' | 'drop';
  }>,
): import('../types').CommandResult {
  let newState = state;
  let baseHash = ontoHash;
  let squashMessages: string[] = [];
  let squashTree: import('../types').FileTree | null = null;

  for (let i = 0; i < actions.length; i++) {
    const { hash, action } = actions[i]!;

    if (action === 'drop') continue;

    const originalCommit = getCommit(state, hash);
    if (!originalCommit) {
      return {
        success: false,
        output: `fatal: corrupt commit ${hash}`,
        newState: state,
      };
    }

    // Get parent tree
    let parentTree = {};
    if (originalCommit.parentHashes.length > 0) {
      const parentCommit = getCommit(state, originalCommit.parentHashes[0]!);
      if (parentCommit) parentTree = parentCommit.tree;
    }

    const baseCommit = getCommit(newState, baseHash);
    if (!baseCommit) {
      return {
        success: false,
        output: 'fatal: corrupt repository state during interactive rebase.',
        newState: state,
      };
    }

    const mergedTree = mergeTreesClean(
      parentTree,
      baseCommit.tree,
      originalCommit.tree,
    );

    if (action === 'squash') {
      squashMessages.push(originalCommit.message);
      squashTree = mergedTree;
      continue;
    }

    // action === 'pick'
    // If there are pending squash messages, combine them
    const messages = [...squashMessages, originalCommit.message];
    squashMessages = [];
    const combinedMessage =
      messages.length > 1 ? messages.join('\n\n') : messages[0]!;

    const finalTree = squashTree ?? mergedTree;
    squashTree = null;

    const timestamp = Date.now() + i;
    const newCommit = createCommit(
      combinedMessage,
      [baseHash],
      finalTree,
      timestamp,
    );

    newState = addCommitToStore(newState, newCommit);
    baseHash = newCommit.hash;
  }

  // Flush any remaining squash
  if (squashMessages.length > 0 && squashTree) {
    const timestamp = Date.now() + actions.length;
    const newCommit = createCommit(
      squashMessages.join('\n\n'),
      [baseHash],
      squashTree,
      timestamp,
    );
    newState = addCommitToStore(newState, newCommit);
    baseHash = newCommit.hash;
  }

  // Update branch pointer
  newState = updateHeadCommit(
    { ...newState, branches: { ...newState.branches } },
    baseHash,
  );

  // Add reflog entry
  newState = {
    ...newState,
    reflog: [
      {
        hash: baseHash,
        description: 'rebase (finish): interactive rebase completed',
      },
      ...state.reflog,
    ],
  };

  return {
    success: true,
    output: 'Successfully rebased and updated HEAD.',
    newState,
  };
}
