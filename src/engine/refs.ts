// engine/refs.ts — Branch and HEAD management

import type { HeadState, RepoState } from './types';

/** Resolve HEAD to a commit hash */
export function resolveHead(state: RepoState): string | null {
  if (state.head.type === 'branch') {
    return state.branches[state.head.name] ?? null;
  }
  return state.head.hash;
}

/** Update the branch that HEAD points to (or update detached HEAD) */
export function updateHeadCommit(
  state: RepoState,
  newHash: string,
): RepoState {
  if (state.head.type === 'branch') {
    return {
      ...state,
      branches: {
        ...state.branches,
        [state.head.name]: newHash,
      },
    };
  }
  return {
    ...state,
    head: { type: 'detached', hash: newHash },
  };
}

/** Set HEAD to point to a branch */
export function setHeadToBranch(
  state: RepoState,
  branchName: string,
): RepoState {
  return {
    ...state,
    head: { type: 'branch', name: branchName },
  };
}

/** Set HEAD to a detached state */
export function setHeadDetached(
  state: RepoState,
  hash: string,
): RepoState {
  return {
    ...state,
    head: { type: 'detached', hash },
  };
}

/** Get the current HEAD state */
export function getHead(state: RepoState): HeadState {
  return state.head;
}

/** Get all branch names */
export function getBranches(state: RepoState): string[] {
  return Object.keys(state.branches);
}

/** Get the commit hash a branch points to */
export function getBranchHash(
  state: RepoState,
  branchName: string,
): string | null {
  return state.branches[branchName] ?? null;
}
