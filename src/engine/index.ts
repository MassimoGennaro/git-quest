// engine/index.ts — Staging area (index) operations

import type { RepoState, StagedChanges } from './types';

/** Stage a file (add to index) */
export function stageFile(
  state: RepoState,
  filename: string,
  content: string,
): RepoState {
  return {
    ...state,
    index: {
      ...state.index,
      [filename]: content,
    },
  };
}

/** Unstage a file (remove from index) */
export function unstageFile(
  state: RepoState,
  filename: string,
): RepoState {
  const newIndex = { ...state.index };
  delete newIndex[filename];
  return {
    ...state,
    index: newIndex,
  };
}

/** Get all staged files */
export function getStagedFiles(state: RepoState): StagedChanges {
  return state.index;
}

/** Check if the staging area is empty */
export function isIndexEmpty(state: RepoState): boolean {
  return Object.keys(state.index).length === 0;
}

/** Clear the entire staging area */
export function clearIndex(state: RepoState): RepoState {
  return {
    ...state,
    index: {},
  };
}
