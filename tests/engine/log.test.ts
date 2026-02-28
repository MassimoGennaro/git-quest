// tests/engine/log.test.ts — Unit tests for git log command

import { describe, it, expect } from 'vitest';
import { log } from '../../src/engine/commands/log';
import { createStateWithCommit } from './helpers';
import type { RepoState, Commit } from '../../src/engine/types';

describe('git log', () => {
  it('should error when there are no commits', () => {
    const state: RepoState = {
      commits: {},
      branches: { main: '' },
      head: { type: 'branch', name: 'main' },
      index: {},
      workingTree: { files: {} },
      remote: { name: 'origin', branches: {} },
      stash: [],
    };

    const result = log([], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('does not have any commits');
  });

  it('should show a single commit', () => {
    const state = createStateWithCommit('initial commit');
    const result = log([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('commit a1b2c3f');
    expect(result.output).toContain('initial commit');
  });

  it('should show HEAD and branch decorations', () => {
    const state = createStateWithCommit('initial commit');
    const result = log([], {}, state);
    expect(result.output).toContain('HEAD -> main');
  });

  it('should show remote branch decorations', () => {
    const state = createStateWithCommit('initial commit');
    const result = log([], {}, state);
    // origin/main also points to the same hash
    expect(result.output).toContain('origin/main');
  });

  it('should show --oneline format', () => {
    const state = createStateWithCommit('initial commit');
    const result = log([], { oneline: true }, state);
    expect(result.success).toBe(true);
    // Oneline format: short hash + decorations + message on single line
    expect(result.output).toContain('a1b2c3f');
    expect(result.output).toContain('initial commit');
    // Should NOT have "commit " prefix in oneline mode
    expect(result.output).not.toContain('commit a1b2c3f');
  });

  it('should walk commit history in order', () => {
    const commit1: Commit = {
      hash: 'aaa0001',
      message: 'first',
      parentHashes: [],
      tree: {},
      timestamp: 1000,
    };
    const commit2: Commit = {
      hash: 'bbb0002',
      message: 'second',
      parentHashes: ['aaa0001'],
      tree: {},
      timestamp: 2000,
    };
    const commit3: Commit = {
      hash: 'ccc0003',
      message: 'third',
      parentHashes: ['bbb0002'],
      tree: {},
      timestamp: 3000,
    };

    const state: RepoState = {
      commits: {
        aaa0001: commit1,
        bbb0002: commit2,
        ccc0003: commit3,
      },
      branches: { main: 'ccc0003' },
      head: { type: 'branch', name: 'main' },
      index: {},
      workingTree: { files: {} },
      remote: { name: 'origin', branches: {} },
      stash: [],
    };

    const result = log([], { oneline: true }, state);
    expect(result.success).toBe(true);

    const lines = result.output.split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
    // Newest first
    expect(lines[0]).toContain('third');
    expect(lines[1]).toContain('second');
    expect(lines[2]).toContain('first');
  });

  it('should show branch labels on correct commits', () => {
    const commit1: Commit = {
      hash: 'aaa0001',
      message: 'first',
      parentHashes: [],
      tree: {},
      timestamp: 1000,
    };
    const commit2: Commit = {
      hash: 'bbb0002',
      message: 'second',
      parentHashes: ['aaa0001'],
      tree: {},
      timestamp: 2000,
    };

    const state: RepoState = {
      commits: {
        aaa0001: commit1,
        bbb0002: commit2,
      },
      branches: {
        main: 'bbb0002',
        develop: 'aaa0001',
      },
      head: { type: 'branch', name: 'main' },
      index: {},
      workingTree: { files: {} },
      remote: { name: 'origin', branches: {} },
      stash: [],
    };

    const result = log([], { oneline: true }, state);
    const lines = result.output.split('\n').filter(Boolean);

    // First line (newest) should have HEAD -> main
    expect(lines[0]).toContain('HEAD -> main');
    // Second line should have develop
    expect(lines[1]).toContain('develop');
  });

  it('should never mutate the state', () => {
    const state = createStateWithCommit('init');
    const result = log([], {}, state);
    expect(result.newState).toBe(state);
  });
});
