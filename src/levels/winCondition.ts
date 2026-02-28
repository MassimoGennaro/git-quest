// levels/winCondition.ts — Pure function to check if a level is won

import type { RepoState } from '@/engine/types';
import type { TargetStateSpec } from './schema';

/**
 * Check whether the current repo state satisfies the target state specification.
 *
 * Comparison rules:
 * - All target branches must exist in the repo; extra branches are allowed
 * - Branches that existed at level start must have advanced (tip hash changed)
 * - Branches that didn't exist at start just need to exist now
 * - All target remote branches must exist (if specified) and have advanced
 * - HEAD position is matched by type + branch name (or hash for detached)
 * - Working tree cleanliness checks for empty index, no modified/untracked/conflicted files
 * - Commit messages are NOT checked
 */
export function checkWinCondition(
  state: RepoState,
  target: TargetStateSpec,
  startingState: RepoState,
): boolean {
  return (
    checkBranches(state, target, startingState) &&
    checkRemoteBranches(state, target, startingState) &&
    checkHead(state, target) &&
    checkWorkingTree(state, target)
  );
}

/**
 * Check that all target branches exist AND have advanced from their starting position.
 * If a branch existed at level start, its tip hash must differ from the starting hash.
 * If a branch is new (didn't exist at start), it just needs to exist.
 */
function checkBranches(
  state: RepoState,
  target: TargetStateSpec,
  startingState: RepoState,
): boolean {
  for (const branchName of target.branches) {
    if (!state.branches[branchName]) return false;
    // If the branch existed at start, it must have advanced
    const startHash = startingState.branches[branchName];
    if (startHash && state.branches[branchName] === startHash) return false;
  }
  return true;
}

/**
 * Check that all target remote branches exist AND have advanced from start.
 * Same logic as checkBranches but for remote branches.
 */
function checkRemoteBranches(
  state: RepoState,
  target: TargetStateSpec,
  startingState: RepoState,
): boolean {
  if (!target.remoteBranches) return true;

  for (const branchName of target.remoteBranches) {
    if (!state.remote.branches[branchName]) return false;
    // If the remote branch existed at start, it must have advanced
    const startHash = startingState.remote.branches[branchName];
    if (startHash && state.remote.branches[branchName] === startHash)
      return false;
  }
  return true;
}

/** Check that HEAD matches the expected position */
function checkHead(state: RepoState, target: TargetStateSpec): boolean {
  if (state.head.type !== target.head.type) return false;

  if (state.head.type === 'branch' && target.head.type === 'branch') {
    return state.head.name === target.head.name;
  }

  if (state.head.type === 'detached' && target.head.type === 'detached') {
    return state.head.hash === target.head.hash;
  }

  return false;
}

/** Check that working tree is clean if required */
function checkWorkingTree(
  state: RepoState,
  target: TargetStateSpec,
): boolean {
  if (!target.workingTreeClean) return true;

  // Index must be empty (no staged changes)
  if (Object.keys(state.index).length > 0) return false;

  // Working tree must have no files (all files committed)
  if (Object.keys(state.workingTree.files).length > 0) return false;

  return true;
}
