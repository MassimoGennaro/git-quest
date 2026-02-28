// tests/engine/diff.test.ts — Tests for the git diff command

import { describe, it, expect } from 'vitest';
import { diff } from '../../src/engine/commands/diff';
import { createEmptyState, createStateWithCommit } from './helpers';

describe('git diff', () => {
  it('should show empty output when no changes exist', () => {
    const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
    const result = diff([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toBe('');
  });

  it('should show modified files in working tree', () => {
    const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
    state.workingTree.files['file.txt'] = {
      status: 'modified',
      content: 'hello world',
    };
    const result = diff([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('diff --git a/file.txt b/file.txt');
    expect(result.output).toContain('-hello');
    expect(result.output).toContain('+hello world');
  });

  it('should show deleted files in working tree', () => {
    const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
    state.workingTree.files['file.txt'] = {
      status: 'deleted',
      content: '',
    };
    const result = diff([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('deleted file');
    expect(result.output).toContain('-hello');
  });

  it('should not show untracked files', () => {
    const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
    state.workingTree.files['new.txt'] = {
      status: 'untracked',
      content: 'something',
    };
    const result = diff([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toBe('');
  });

  it('should show conflicted files with conflict markers', () => {
    const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
    state.workingTree.files['file.txt'] = {
      status: 'conflicted',
      content: '',
      conflictOurs: 'our version',
      conflictTheirs: 'their version',
    };
    const result = diff([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('<<<<<<< ours');
    expect(result.output).toContain('our version');
    expect(result.output).toContain('=======');
    expect(result.output).toContain('their version');
    expect(result.output).toContain('>>>>>>> theirs');
  });

  describe('--staged / --cached', () => {
    it('should show staged new files', () => {
      const state = createStateWithCommit('initial', {});
      state.index['newfile.txt'] = 'new content';
      const result = diff([], { staged: true }, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('new file');
      expect(result.output).toContain('+new content');
    });

    it('should show staged modifications', () => {
      const state = createStateWithCommit('initial', {
        'file.txt': 'original',
      });
      state.index['file.txt'] = 'modified';
      const result = diff([], { staged: true }, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('-original');
      expect(result.output).toContain('+modified');
    });

    it('should show staged deletions', () => {
      const state = createStateWithCommit('initial', {
        'file.txt': 'content',
      });
      state.index['file.txt'] = '__DELETED__';
      const result = diff([], { staged: true }, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('deleted file');
      expect(result.output).toContain('-content');
    });

    it('should work with --cached flag as alias for --staged', () => {
      const state = createStateWithCommit('initial', {});
      state.index['newfile.txt'] = 'content';
      const result = diff([], { cached: true }, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('new file');
    });

    it('should show empty output when nothing is staged', () => {
      const state = createStateWithCommit('initial', {
        'file.txt': 'content',
      });
      const result = diff([], { staged: true }, state);
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });
  });

  it('should diff working tree against staged content when both exist', () => {
    const state = createStateWithCommit('initial', { 'file.txt': 'original' });
    // Stage a change
    state.index['file.txt'] = 'staged version';
    // Then modify working tree further
    state.workingTree.files['file.txt'] = {
      status: 'modified',
      content: 'working version',
    };
    const result = diff([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('-staged version');
    expect(result.output).toContain('+working version');
  });

  it('should handle empty repo with no commits', () => {
    const state = createEmptyState();
    const result = diff([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toBe('');
  });
});
