// engine/commands/cherryPick.ts — git cherry-pick command handler

import type { CommandHandler, RepoState } from '../types';
import { resolveHead, updateHeadCommit } from '../refs';
import { createCommit, addCommitToStore, getCommit } from '../store';
import { detectConflicts, mergeTreesClean } from '../mergeUtils';

/**
 * git cherry-pick <commit-hash>  — apply the changes from a specific commit
 *
 * Cherry-pick replays the diff of the given commit (relative to its parent)
 * on top of the current HEAD. This creates a new commit with the same message.
 *
 * If the commit has conflicts with the current tree, conflicted files are
 * placed in the working tree and the user must resolve them.
 */
export const cherryPick: CommandHandler = (args, _flags, state) => {
  if (args.length === 0) {
    return {
      success: false,
      output: 'fatal: No commit specified. Usage: git cherry-pick <commit>',
      newState: state,
    };
  }

  const targetHash = resolveCommitRef(args[0]!, state);
  if (!targetHash) {
    return {
      success: false,
      output: `fatal: bad revision '${args[0]}'`,
      newState: state,
    };
  }

  const targetCommit = getCommit(state, targetHash);
  if (!targetCommit) {
    return {
      success: false,
      output: `fatal: bad revision '${args[0]}'`,
      newState: state,
    };
  }

  const headHash = resolveHead(state);
  if (!headHash) {
    return {
      success: false,
      output: 'fatal: no commits yet. Cannot cherry-pick.',
      newState: state,
    };
  }

  const headCommit = getCommit(state, headHash);
  if (!headCommit) {
    return {
      success: false,
      output: 'fatal: corrupt repository state.',
      newState: state,
    };
  }

  // Get the parent of the cherry-picked commit (its "base")
  // For root commits, use an empty tree as the ancestor
  let ancestorTree = {};
  if (targetCommit.parentHashes.length > 0) {
    const parentCommit = getCommit(state, targetCommit.parentHashes[0]!);
    if (parentCommit) {
      ancestorTree = parentCommit.tree;
    }
  }

  // Detect conflicts: treat HEAD tree as "ours", cherry-picked commit tree as "theirs"
  const conflicts = detectConflicts(ancestorTree, headCommit.tree, targetCommit.tree);

  if (Object.keys(conflicts).length > 0) {
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
      conflictSet[filename] = {
        ours: conflict.ours,
        theirs: conflict.theirs,
        ancestor: conflict.ancestor,
      };
    }

    const newState: RepoState = {
      ...state,
      workingTree: {
        files: {
          ...state.workingTree.files,
          ...conflictedFiles,
        },
      },
    };

    const conflictNames = Object.keys(conflicts).join(', ');
    return {
      success: false,
      output: `CONFLICT (content): Merge conflict in ${conflictNames}\nAfter resolving the conflicts, use "git add" and "git commit" to complete the cherry-pick.`,
      newState,
      conflictsTriggered: conflictSet,
    };
  }

  // No conflicts — apply the diff cleanly and create a new commit
  const mergedTree = mergeTreesClean(ancestorTree, headCommit.tree, targetCommit.tree);

  const timestamp = Date.now();
  const newCommit = createCommit(
    targetCommit.message,
    [headHash],
    mergedTree,
    timestamp,
  );

  let newState = addCommitToStore(state, newCommit);
  newState = updateHeadCommit(newState, newCommit.hash);

  // Add reflog entry
  newState = {
    ...newState,
    reflog: [
      {
        hash: newCommit.hash,
        description: `cherry-pick: ${targetCommit.message}`,
      },
      ...state.reflog,
    ],
  };

  const branchName =
    state.head.type === 'branch' ? state.head.name : newCommit.hash.slice(0, 7);

  return {
    success: true,
    output: `[${branchName} ${newCommit.hash.slice(0, 7)}] ${targetCommit.message}`,
    newState,
  };
};

/** Resolve a commit reference (hash or hash prefix) to a full hash */
function resolveCommitRef(ref: string, state: RepoState): string | null {
  // Exact match
  if (ref in state.commits) return ref;

  // Branch name
  if (ref in state.branches) return state.branches[ref]!;

  // Hash prefix match
  const matches = Object.keys(state.commits).filter((h) => h.startsWith(ref));
  if (matches.length === 1) return matches[0]!;

  return null;
}
