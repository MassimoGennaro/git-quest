// tests/engine/helpers.ts — Shared test utilities for engine tests

import type { RepoState, Commit } from '../../src/engine/types';

/** Create a minimal empty repo state for testing */
export function createEmptyState(): RepoState {
  return {
    commits: {},
    branches: { main: '' },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
    reflog: [],
  };
}

/** Create a repo state with one initial commit */
export function createStateWithCommit(
  message = 'initial commit',
  files: Record<string, string> = {},
): RepoState {
  const tree: Record<string, { content: string }> = {};
  for (const [name, content] of Object.entries(files)) {
    tree[name] = { content };
  }

  const commit: Commit = {
    hash: 'a1b2c3f',
    message,
    parentHashes: [],
    tree,
    timestamp: 1000000,
  };

  return {
    commits: { [commit.hash]: commit },
    branches: { main: commit.hash },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: { main: commit.hash } },
    stash: [],
    reflog: [],
  };
}
