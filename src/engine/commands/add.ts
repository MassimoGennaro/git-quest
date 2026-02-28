// engine/commands/add.ts — git add command handler

import type { CommandHandler, RepoState } from '../types';
import { resolveHead } from '../refs';
import { getCommit } from '../store';

export const add: CommandHandler = (args, _flags, state) => {
  if (args.length === 0) {
    return {
      success: false,
      output: 'Nothing specified, nothing added.\nMaybe you wanted to say "git add ."?',
      newState: state,
    };
  }

  const filesToAdd = resolveFileArgs(args, state);

  if (filesToAdd.length === 0) {
    return {
      success: false,
      output: 'No matching files found in working tree.',
      newState: state,
    };
  }

  let newState = state;

  for (const filename of filesToAdd) {
    const workingFile = newState.workingTree.files[filename];
    if (!workingFile) {
      continue;
    }

    if (workingFile.status === 'deleted') {
      // Stage a deletion: add to index with empty content marker,
      // and remove from working tree
      newState = {
        ...newState,
        index: {
          ...newState.index,
          [filename]: '__DELETED__',
        },
        workingTree: {
          files: removeFile(newState.workingTree.files, filename),
        },
      };
    } else {
      // Stage the file content
      newState = {
        ...newState,
        index: {
          ...newState.index,
          [filename]: workingFile.content,
        },
        workingTree: {
          files: removeFile(newState.workingTree.files, filename),
        },
      };
    }
  }

  return {
    success: true,
    output: '',
    newState,
  };
};

/** Resolve file arguments, expanding "." to all working tree files */
function resolveFileArgs(args: string[], state: RepoState): string[] {
  if (args.includes('.')) {
    return Object.keys(state.workingTree.files);
  }

  const files: string[] = [];
  for (const arg of args) {
    if (arg in state.workingTree.files) {
      files.push(arg);
    }
  }
  return files;
}

/** Helper to create a new files object without a specific key */
function removeFile(
  files: Record<string, unknown>,
  filename: string,
): Record<string, never> {
  const result = { ...files };
  delete result[filename];
  return result as Record<string, never>;
}

/**
 * Get the tree snapshot of what's currently committed at HEAD.
 * Used by other commands to determine what's "tracked".
 */
export function getHeadTree(state: RepoState): Record<string, string> {
  const headHash = resolveHead(state);
  if (!headHash) return {};
  const commit = getCommit(state, headHash);
  if (!commit) return {};
  const result: Record<string, string> = {};
  for (const [name, file] of Object.entries(commit.tree)) {
    result[name] = file.content;
  }
  return result;
}
