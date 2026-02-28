// tests/engine/commit.test.ts — Unit tests for git commit command

import { describe, it, expect } from 'vitest';
import { commit } from '../../src/engine/commands/commit';
import { createStateWithCommit } from './helpers';
import type { RepoState } from '../../src/engine/types';

describe('git commit', () => {
  it('should error when no message provided', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'README.md': '# Hello' },
    };

    const result = commit([], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('empty commit message');
  });

  it('should error when staging area is empty', () => {
    const state = createStateWithCommit('init');
    const result = commit([], { m: 'test commit' }, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('nothing to commit');
  });

  it('should create a commit with -m flag', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'README.md': '# Hello' },
    };

    const result = commit([], { m: 'add README' }, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('add README');
    expect(result.output).toContain('main');

    // Index should be cleared
    expect(Object.keys(result.newState.index)).toHaveLength(0);

    // New commit should exist in the store
    const newHash = result.newState.branches['main'];
    expect(newHash).toBeDefined();
    expect(newHash).not.toBe('a1b2c3f'); // should be different from initial

    const newCommit = result.newState.commits[newHash!];
    expect(newCommit).toBeDefined();
    expect(newCommit!.message).toBe('add README');
    expect(newCommit!.parentHashes).toContain('a1b2c3f');
  });

  it('should include staged files in the commit tree', () => {
    const state: RepoState = {
      ...createStateWithCommit('init', { 'existing.txt': 'hello' }),
      index: { 'new.txt': 'new content' },
    };

    const result = commit([], { m: 'add new file' }, state);
    expect(result.success).toBe(true);

    const newHash = result.newState.branches['main']!;
    const newCommit = result.newState.commits[newHash];
    expect(newCommit).toBeDefined();

    // Should have both old and new files
    expect(newCommit!.tree['existing.txt']).toEqual({ content: 'hello' });
    expect(newCommit!.tree['new.txt']).toEqual({ content: 'new content' });
  });

  it('should handle deleting a file via staging', () => {
    const state: RepoState = {
      ...createStateWithCommit('init', { 'old.txt': 'old' }),
      index: { 'old.txt': '__DELETED__' },
    };

    const result = commit([], { m: 'remove old file' }, state);
    expect(result.success).toBe(true);

    const newHash = result.newState.branches['main']!;
    const newCommit = result.newState.commits[newHash];
    expect(newCommit!.tree['old.txt']).toBeUndefined();
  });

  it('should show file count in output', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: {
        'a.txt': 'a',
        'b.txt': 'b',
        'c.txt': 'c',
      },
    };

    const result = commit([], { m: 'add files' }, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('3 files changed');
  });

  it('should show singular "file" for single file change', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'one.txt': 'one' },
    };

    const result = commit([], { m: 'add one file' }, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('1 file changed');
  });

  it('should set the parent hash to the previous HEAD', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'file.txt': 'content' },
    };

    const result = commit([], { m: 'second commit' }, state);
    const newHash = result.newState.branches['main']!;
    const newCommit = result.newState.commits[newHash]!;
    expect(newCommit.parentHashes).toEqual(['a1b2c3f']);
  });

  it('should create a root commit when no prior commits exist', () => {
    const state: RepoState = {
      commits: {},
      branches: { main: '' },
      head: { type: 'branch', name: 'main' },
      index: { 'README.md': '# App' },
      workingTree: { files: {} },
      remote: { name: 'origin', branches: {} },
      stash: [],
      reflog: [],
    };

    const result = commit([], { m: 'initial commit' }, state);
    expect(result.success).toBe(true);

    const newHash = result.newState.branches['main']!;
    const newCommit = result.newState.commits[newHash]!;
    expect(newCommit.parentHashes).toEqual([]);
    expect(newCommit.message).toBe('initial commit');
  });

  describe('--amend', () => {
    it('should amend the last commit message', () => {
      const state: RepoState = {
        ...createStateWithCommit('typo in mesage'),
        index: {},
      };

      const result = commit([], { amend: true, m: 'fix typo in message' }, state);
      expect(result.success).toBe(true);

      const newHash = result.newState.branches['main']!;
      const newCommit = result.newState.commits[newHash]!;
      expect(newCommit.message).toBe('fix typo in message');
      // Amending a root commit: should have no parents
      expect(newCommit.parentHashes).toEqual([]);
    });

    it('should error when amending with no commits', () => {
      const state: RepoState = {
        commits: {},
        branches: { main: '' },
        head: { type: 'branch', name: 'main' },
        index: {},
        workingTree: { files: {} },
        remote: { name: 'origin', branches: {} },
        stash: [],
        reflog: [],
      };

      const result = commit([], { amend: true, m: 'fix' }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('no commits');
    });
  });
});
