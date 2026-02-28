// engine/commands/commit.ts — git commit command handler

import type { CommandHandler, FileTree } from '../types';
import { resolveHead, updateHeadCommit } from '../refs';
import { createCommit, addCommitToStore, getCommit } from '../store';
import { isIndexEmpty } from '../index';

export const commit: CommandHandler = (_args, flags, state) => {
  // Check for --amend flag
  const isAmend = flags['amend'] === true;

  // Get the commit message
  const message = typeof flags['m'] === 'string' ? flags['m'] : undefined;

  if (!message && !isAmend) {
    return {
      success: false,
      output: 'Aborting commit due to empty commit message.\nUse -m "message" to provide a commit message.',
      newState: state,
    };
  }

  // Check for empty staging area (unless amending)
  if (isIndexEmpty(state) && !isAmend) {
    return {
      success: false,
      output:
        'nothing to commit, working tree clean\n(use "git add" to track files)',
      newState: state,
    };
  }

  const headHash = resolveHead(state);

  // Build the new file tree: start from the parent commit's tree, apply staged changes
  let baseTree: FileTree = {};
  const parentHashes: string[] = [];

  if (headHash) {
    parentHashes.push(headHash);
    const parentCommit = getCommit(state, headHash);
    if (parentCommit) {
      baseTree = { ...parentCommit.tree };
    }
  }

  // If amending, we replace the current HEAD commit
  if (isAmend) {
    if (!headHash) {
      return {
        success: false,
        output: 'Cannot amend: no commits yet.',
        newState: state,
      };
    }
    const currentCommit = getCommit(state, headHash);
    if (!currentCommit) {
      return {
        success: false,
        output: 'Cannot amend: HEAD commit not found.',
        newState: state,
      };
    }

    // Use the parent of the current commit as the new parent
    parentHashes.length = 0;
    parentHashes.push(...currentCommit.parentHashes);

    // Start from the current commit's tree
    baseTree = { ...currentCommit.tree };

    // Apply any staged changes on top
    for (const [filename, content] of Object.entries(state.index)) {
      if (content === '__DELETED__') {
        delete baseTree[filename];
      } else {
        baseTree[filename] = { content };
      }
    }

    const amendMessage = message ?? currentCommit.message;
    const timestamp = Date.now();
    const newCommit = createCommit(amendMessage, parentHashes, baseTree, timestamp);

    let newState = addCommitToStore(state, newCommit);
    newState = updateHeadCommit(newState, newCommit.hash);
    newState = { ...newState, index: {} };

    return {
      success: true,
      output: `[${state.head.type === 'branch' ? state.head.name : newCommit.hash.slice(0, 7)} ${newCommit.hash.slice(0, 7)}] ${amendMessage}`,
      newState,
    };
  }

  // Normal commit: apply staged changes to the base tree
  for (const [filename, content] of Object.entries(state.index)) {
    if (content === '__DELETED__') {
      delete baseTree[filename];
    } else {
      baseTree[filename] = { content };
    }
  }

  const timestamp = Date.now();
  const newCommit = createCommit(message!, parentHashes, baseTree, timestamp);

  let newState = addCommitToStore(state, newCommit);
  newState = updateHeadCommit(newState, newCommit.hash);
  // Clear the staging area after commit
  newState = { ...newState, index: {} };

  const branchName =
    state.head.type === 'branch' ? state.head.name : newCommit.hash.slice(0, 7);

  const fileCount = Object.keys(state.index).length;
  const fileWord = fileCount === 1 ? 'file' : 'files';

  return {
    success: true,
    output: `[${branchName} ${newCommit.hash.slice(0, 7)}] ${message}\n ${fileCount} ${fileWord} changed`,
    newState,
  };
};
