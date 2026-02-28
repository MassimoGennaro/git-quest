// engine/workingTree.ts — Working tree state operations

import type { RepoState, WorkingFile, WorkingTreeState } from './types';

/** Get the current working tree */
export function getWorkingTree(state: RepoState): WorkingTreeState {
  return state.workingTree;
}

/** Set a file in the working tree */
export function setWorkingFile(
  state: RepoState,
  filename: string,
  file: WorkingFile,
): RepoState {
  return {
    ...state,
    workingTree: {
      files: {
        ...state.workingTree.files,
        [filename]: file,
      },
    },
  };
}

/** Remove a file from the working tree */
export function removeWorkingFile(
  state: RepoState,
  filename: string,
): RepoState {
  const newFiles = { ...state.workingTree.files };
  delete newFiles[filename];
  return {
    ...state,
    workingTree: { files: newFiles },
  };
}

/** Get files by status */
export function getFilesByStatus(
  state: RepoState,
  status: WorkingFile['status'],
): Record<string, WorkingFile> {
  const result: Record<string, WorkingFile> = {};
  for (const [name, file] of Object.entries(state.workingTree.files)) {
    if (file.status === status) {
      result[name] = file;
    }
  }
  return result;
}

/** Check if the working tree is clean (no files at all) */
export function isWorkingTreeClean(state: RepoState): boolean {
  return Object.keys(state.workingTree.files).length === 0;
}
