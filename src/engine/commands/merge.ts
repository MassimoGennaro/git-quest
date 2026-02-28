// engine/commands/merge.ts — git merge command handler

import type { CommandHandler, RepoState } from '../types';
import { updateHeadCommit } from '../refs';
import { createCommit, addCommitToStore, getCommit } from '../store';
import {
  isAncestor,
  findCommonAncestor,
  detectConflicts,
  mergeTreesClean,
} from '../mergeUtils';

/**
 * git merge <branch>  — merge a branch into the current branch
 *
 * Supports:
 *   - Fast-forward merge (when current branch is an ancestor of the target)
 *   - Three-way merge (creates a merge commit)
 *   - Conflict detection (sets conflicted files in working tree)
 */
export const merge: CommandHandler = (args, _flags, state) => {
  if (args.length === 0) {
    return {
      success: false,
      output: 'fatal: No branch specified. Usage: git merge <branch>',
      newState: state,
    };
  }

  if (state.head.type !== 'branch') {
    return {
      success: false,
      output: 'fatal: Cannot merge in detached HEAD state.',
      newState: state,
    };
  }

  const targetBranch = args[0]!;

  if (!(targetBranch in state.branches)) {
    return {
      success: false,
      output: `merge: ${targetBranch} - not something we can merge.`,
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
      output: 'Already up to date.',
      newState: state,
    };
  }

  // Check if target is ancestor of current (nothing to merge)
  if (isAncestor(state, targetHash, currentHash)) {
    return {
      success: true,
      output: 'Already up to date.',
      newState: state,
    };
  }

  // Fast-forward: current is an ancestor of target
  if (isAncestor(state, currentHash, targetHash)) {
    const newState = {
      ...state,
      branches: {
        ...state.branches,
        [currentBranch]: targetHash,
      },
    };

    const targetCommit = getCommit(state, targetHash);
    const shortHash = targetHash.slice(0, 7);
    const message = targetCommit?.message ?? '';

    return {
      success: true,
      output: `Updating ${currentHash.slice(0, 7)}..${shortHash}\nFast-forward\n ${message}`,
      newState,
    };
  }

  // Three-way merge: find common ancestor, detect conflicts
  const ancestorHash = findCommonAncestor(state, currentHash, targetHash);
  if (!ancestorHash) {
    return {
      success: false,
      output: 'fatal: refusing to merge unrelated histories.',
      newState: state,
    };
  }

  const ancestorCommit = getCommit(state, ancestorHash);
  const currentCommit = getCommit(state, currentHash);
  const targetCommit = getCommit(state, targetHash);

  if (!ancestorCommit || !currentCommit || !targetCommit) {
    return {
      success: false,
      output: 'fatal: corrupt repository state.',
      newState: state,
    };
  }

  // Detect file-level conflicts
  const conflicts = detectConflicts(
    ancestorCommit.tree,
    currentCommit.tree,
    targetCommit.tree,
  );

  if (Object.keys(conflicts).length > 0) {
    // Set conflicted files in working tree, return conflict info
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

    // Track the merge state so commit knows about the merge parent
    const newState: RepoState = {
      ...state,
      workingTree: {
        files: {
          ...state.workingTree.files,
          ...conflictedFiles,
        },
      },
      mergeHead: targetHash,
    };

    const conflictNames = Object.keys(conflicts).join(', ');
    return {
      success: false,
      output: `Auto-merging failed.\nCONFLICT (content): Merge conflict in ${conflictNames}\nAutomatic merge failed; fix conflicts and then commit the result.`,
      newState,
      conflictsTriggered: conflictSet,
    };
  }

  // No conflicts — create merge commit
  const mergedTree = mergeTreesClean(
    ancestorCommit.tree,
    currentCommit.tree,
    targetCommit.tree,
  );

  const mergeMessage = `Merge branch '${targetBranch}' into ${currentBranch}`;
  const timestamp = Date.now();
  const mergeCommit = createCommit(
    mergeMessage,
    [currentHash, targetHash],
    mergedTree,
    timestamp,
  );

  let newState = addCommitToStore(state, mergeCommit);
  newState = updateHeadCommit(newState, mergeCommit.hash);

  return {
    success: true,
    output: `Merge made by the 'ort' strategy.\n ${mergeMessage}`,
    newState,
  };
};
