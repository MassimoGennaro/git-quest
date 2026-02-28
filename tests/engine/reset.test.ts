// tests/engine/reset.test.ts — Tests for the git reset command

import { describe, it, expect } from 'vitest';
import { reset } from '../../src/engine/commands/reset';
import { createStateWithCommit } from './helpers';
import type { Commit, RepoState } from '../../src/engine/types';

/** Helper: create a repo with a chain of commits (3 deep) */
function createChainState(): RepoState {
  const commit1: Commit = {
    hash: 'aaa0001',
    message: 'first commit',
    parentHashes: [],
    tree: { 'file.txt': { content: 'v1' } },
    timestamp: 1000,
  };
  const commit2: Commit = {
    hash: 'bbb0002',
    message: 'second commit',
    parentHashes: ['aaa0001'],
    tree: { 'file.txt': { content: 'v2' } },
    timestamp: 2000,
  };
  const commit3: Commit = {
    hash: 'ccc0003',
    message: 'third commit',
    parentHashes: ['bbb0002'],
    tree: { 'file.txt': { content: 'v3' } },
    timestamp: 3000,
  };

  return {
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
    reflog: [],
  };
}

describe('git reset', () => {
  describe('file unstaging (git reset HEAD <file>)', () => {
    it('should unstage a specific file', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.index['new.txt'] = 'content';
      state.index['other.txt'] = 'other';

      const result = reset(['HEAD', 'new.txt'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.index['new.txt']).toBeUndefined();
      expect(result.newState.index['other.txt']).toBe('other');
    });

    it('should unstage multiple files', () => {
      const state = createStateWithCommit('initial', {});
      state.index['a.txt'] = 'a';
      state.index['b.txt'] = 'b';
      state.index['c.txt'] = 'c';

      const result = reset(['HEAD', 'a.txt', 'b.txt'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.index['a.txt']).toBeUndefined();
      expect(result.newState.index['b.txt']).toBeUndefined();
      expect(result.newState.index['c.txt']).toBe('c');
    });

    it('should handle unstaging a file not in the index', () => {
      const state = createStateWithCommit('initial', {});
      const result = reset(['HEAD', 'notexist.txt'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('No changes');
    });
  });

  describe('unstage all (git reset with no args)', () => {
    it('should unstage all files', () => {
      const state = createStateWithCommit('initial', {});
      state.index['a.txt'] = 'a';
      state.index['b.txt'] = 'b';

      const result = reset([], {}, state);
      expect(result.success).toBe(true);
      expect(Object.keys(result.newState.index)).toHaveLength(0);
      expect(result.output).toContain('a.txt');
      expect(result.output).toContain('b.txt');
    });

    it('should show message when nothing to reset', () => {
      const state = createStateWithCommit('initial', {});
      const result = reset([], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Nothing to reset');
    });
  });

  describe('--soft reset', () => {
    it('should move HEAD back but keep index and working tree', () => {
      const state = createChainState();
      state.index['staged.txt'] = 'staged';
      state.workingTree.files['wt.txt'] = {
        status: 'modified',
        content: 'working',
      };

      const result = reset(['HEAD~1'], { soft: true }, state);
      expect(result.success).toBe(true);
      expect(result.newState.branches['main']).toBe('bbb0002');
      // Index and working tree preserved
      expect(result.newState.index['staged.txt']).toBe('staged');
      expect(result.newState.workingTree.files['wt.txt']).toBeDefined();
    });

    it('should add a reflog entry', () => {
      const state = createChainState();
      const result = reset(['HEAD~1'], { soft: true }, state);
      expect(result.success).toBe(true);
      expect(result.newState.reflog).toHaveLength(1);
      expect(result.newState.reflog[0]!.hash).toBe('bbb0002');
      expect(result.newState.reflog[0]!.description).toContain('reset');
    });
  });

  describe('--mixed reset (default)', () => {
    it('should move HEAD back and clear index but keep working tree', () => {
      const state = createChainState();
      state.index['staged.txt'] = 'staged';
      state.workingTree.files['wt.txt'] = {
        status: 'modified',
        content: 'working',
      };

      const result = reset(['HEAD~1'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.branches['main']).toBe('bbb0002');
      // Index cleared
      expect(Object.keys(result.newState.index)).toHaveLength(0);
      // Working tree preserved
      expect(result.newState.workingTree.files['wt.txt']).toBeDefined();
    });
  });

  describe('--hard reset', () => {
    it('should move HEAD back and clear both index and working tree', () => {
      const state = createChainState();
      state.index['staged.txt'] = 'staged';
      state.workingTree.files['wt.txt'] = {
        status: 'modified',
        content: 'working',
      };

      const result = reset(['HEAD~1'], { hard: true }, state);
      expect(result.success).toBe(true);
      expect(result.newState.branches['main']).toBe('bbb0002');
      expect(Object.keys(result.newState.index)).toHaveLength(0);
      expect(Object.keys(result.newState.workingTree.files)).toHaveLength(0);
    });
  });

  describe('HEAD~N resolution', () => {
    it('should resolve HEAD~2 to go back 2 commits', () => {
      const state = createChainState();
      const result = reset(['HEAD~2'], { soft: true }, state);
      expect(result.success).toBe(true);
      expect(result.newState.branches['main']).toBe('aaa0001');
    });

    it('should resolve HEAD~ as HEAD~1', () => {
      const state = createChainState();
      const result = reset(['HEAD~'], { soft: true }, state);
      expect(result.success).toBe(true);
      expect(result.newState.branches['main']).toBe('bbb0002');
    });

    it('should fail when going back too far', () => {
      const state = createChainState();
      const result = reset(['HEAD~10'], { soft: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('unknown revision');
    });
  });

  describe('reset to hash', () => {
    it('should reset to a specific commit hash', () => {
      const state = createChainState();
      const result = reset(['aaa0001'], { soft: true }, state);
      expect(result.success).toBe(true);
      expect(result.newState.branches['main']).toBe('aaa0001');
    });
  });

  it('should fail for unknown target', () => {
    const state = createChainState();
    const result = reset(['nonexistent'], { soft: true }, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('unknown revision');
  });

  it('should work with detached HEAD', () => {
    const state = createChainState();
    state.head = { type: 'detached', hash: 'ccc0003' };

    const result = reset(['HEAD~1'], { hard: true }, state);
    expect(result.success).toBe(true);
    expect(result.newState.head).toEqual({
      type: 'detached',
      hash: 'bbb0002',
    });
  });
});
