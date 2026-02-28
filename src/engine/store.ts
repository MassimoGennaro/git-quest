// engine/store.ts — Object store operations (commits, trees)

import type { Commit, FileTree, RepoState } from './types';

/**
 * Generate a deterministic short hash from commit content.
 * Not a real SHA-1, but looks realistic (7 hex chars).
 */
export function generateHash(
  message: string,
  parentHashes: string[],
  timestamp: number,
): string {
  const input = message + parentHashes.join(',') + String(timestamp);
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Convert to 7-char hex string, always positive
  const hex = Math.abs(hash).toString(16).padStart(7, '0').slice(0, 7);
  return hex;
}

/** Create a new commit object */
export function createCommit(
  message: string,
  parentHashes: string[],
  tree: FileTree,
  timestamp: number,
): Commit {
  const hash = generateHash(message, parentHashes, timestamp);
  return {
    hash,
    message,
    parentHashes,
    tree,
    timestamp,
  };
}

/** Add a commit to the object store, returning a new state */
export function addCommitToStore(
  state: RepoState,
  commit: Commit,
): RepoState {
  return {
    ...state,
    commits: {
      ...state.commits,
      [commit.hash]: commit,
    },
  };
}

/** Look up a commit by hash */
export function getCommit(
  state: RepoState,
  hash: string,
): Commit | undefined {
  return state.commits[hash];
}
