// engine/commands/merge.ts — git merge command handler

import type { CommandHandler, FileTree, RepoState } from '../types';
import { updateHeadCommit } from '../refs';
import { createCommit, addCommitToStore, getCommit } from '../store';

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

    // Also need to track the merge state so commit knows about the merge
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

/**
 * Check if `ancestorHash` is an ancestor of `descendantHash`.
 * Uses BFS to walk the commit graph backwards from the descendant.
 */
function isAncestor(
  state: RepoState,
  ancestorHash: string,
  descendantHash: string,
): boolean {
  if (ancestorHash === descendantHash) return true;

  const visited = new Set<string>();
  const queue = [descendantHash];

  while (queue.length > 0) {
    const hash = queue.shift()!;
    if (hash === ancestorHash) return true;
    if (visited.has(hash)) continue;
    visited.add(hash);

    const commit = getCommit(state, hash);
    if (commit) {
      queue.push(...commit.parentHashes);
    }
  }

  return false;
}

/**
 * Find the common ancestor of two commits using BFS from both sides.
 * Returns the first commit hash reachable from both.
 */
function findCommonAncestor(
  state: RepoState,
  hashA: string,
  hashB: string,
): string | null {
  const ancestorsA = getAllAncestors(state, hashA);
  const ancestorsB = getAllAncestors(state, hashB);

  // Walk ancestors of B in order, find first that's also ancestor of A
  // Actually, let's just find the intersection closest to both
  for (const hash of ancestorsB) {
    if (ancestorsA.has(hash)) {
      return hash;
    }
  }

  return null;
}

/** Get all ancestor hashes of a commit (including itself), in BFS order */
function getAllAncestors(state: RepoState, hash: string): Set<string> {
  const ancestors = new Set<string>();
  const queue = [hash];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (ancestors.has(current)) continue;
    ancestors.add(current);

    const commit = getCommit(state, current);
    if (commit) {
      queue.push(...commit.parentHashes);
    }
  }

  return ancestors;
}

/** Detect file-level conflicts between ancestor, ours, and theirs trees */
function detectConflicts(
  ancestor: FileTree,
  ours: FileTree,
  theirs: FileTree,
): Record<string, { ours: string; theirs: string; ancestor: string }> {
  const conflicts: Record<
    string,
    { ours: string; theirs: string; ancestor: string }
  > = {};

  // Get all file names across all three trees
  const allFiles = new Set([
    ...Object.keys(ancestor),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ]);

  for (const filename of allFiles) {
    const ancestorContent = ancestor[filename]?.content ?? '';
    const oursContent = ours[filename]?.content ?? '';
    const theirsContent = theirs[filename]?.content ?? '';

    // Both modified the same file differently from ancestor
    const oursChanged = oursContent !== ancestorContent;
    const theirsChanged = theirsContent !== ancestorContent;

    if (oursChanged && theirsChanged && oursContent !== theirsContent) {
      conflicts[filename] = {
        ours: oursContent,
        theirs: theirsContent,
        ancestor: ancestorContent,
      };
    }
  }

  return conflicts;
}

/** Merge two trees cleanly (no conflicts) relative to a common ancestor */
function mergeTreesClean(
  ancestor: FileTree,
  ours: FileTree,
  theirs: FileTree,
): FileTree {
  const result: FileTree = { ...ours };

  // Apply changes from theirs that differ from ancestor
  for (const [filename, file] of Object.entries(theirs)) {
    const ancestorContent = ancestor[filename]?.content ?? '';
    if (file.content !== ancestorContent) {
      // Theirs changed this file — take their version
      result[filename] = { content: file.content };
    }
  }

  // Handle deletions in theirs
  for (const filename of Object.keys(ancestor)) {
    if (!(filename in theirs) && filename in ours) {
      // Theirs deleted this file, ours kept it
      const oursContent = ours[filename]?.content ?? '';
      const ancestorContent = ancestor[filename]?.content ?? '';
      if (oursContent === ancestorContent) {
        // Ours didn't change it, so accept the deletion
        delete result[filename];
      }
    }
  }

  // Handle additions in theirs
  for (const [filename, file] of Object.entries(theirs)) {
    if (!(filename in ancestor) && !(filename in ours)) {
      result[filename] = { content: file.content };
    }
  }

  return result;
}
