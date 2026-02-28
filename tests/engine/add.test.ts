// tests/engine/add.test.ts — Unit tests for git add command

import { describe, it, expect } from 'vitest';
import { add } from '../../src/engine/commands/add';
import { createStateWithCommit } from './helpers';
import type { RepoState } from '../../src/engine/types';

describe('git add', () => {
  it('should error when no arguments provided', () => {
    const state = createStateWithCommit('init');
    const result = add([], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('Nothing specified');
  });

  it('should stage an untracked file', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      workingTree: {
        files: {
          'README.md': { status: 'untracked', content: '# Hello' },
        },
      },
    };

    const result = add(['README.md'], {}, state);
    expect(result.success).toBe(true);
    expect(result.newState.index['README.md']).toBe('# Hello');
    // File should be removed from working tree after staging
    expect(result.newState.workingTree.files['README.md']).toBeUndefined();
  });

  it('should stage a modified file', () => {
    const state: RepoState = {
      ...createStateWithCommit('init', { 'config.js': 'timeout: 1000' }),
      workingTree: {
        files: {
          'config.js': { status: 'modified', content: 'timeout: 5000' },
        },
      },
    };

    const result = add(['config.js'], {}, state);
    expect(result.success).toBe(true);
    expect(result.newState.index['config.js']).toBe('timeout: 5000');
    expect(result.newState.workingTree.files['config.js']).toBeUndefined();
  });

  it('should stage all files with "."', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      workingTree: {
        files: {
          'README.md': { status: 'untracked', content: '# App' },
          'config.js': { status: 'modified', content: 'updated' },
        },
      },
    };

    const result = add(['.'], {}, state);
    expect(result.success).toBe(true);
    expect(result.newState.index['README.md']).toBe('# App');
    expect(result.newState.index['config.js']).toBe('updated');
    expect(Object.keys(result.newState.workingTree.files)).toHaveLength(0);
  });

  it('should stage multiple specific files', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      workingTree: {
        files: {
          'a.txt': { status: 'untracked', content: 'a' },
          'b.txt': { status: 'untracked', content: 'b' },
          'c.txt': { status: 'untracked', content: 'c' },
        },
      },
    };

    const result = add(['a.txt', 'b.txt'], {}, state);
    expect(result.success).toBe(true);
    expect(result.newState.index['a.txt']).toBe('a');
    expect(result.newState.index['b.txt']).toBe('b');
    expect(result.newState.index['c.txt']).toBeUndefined();
    // c.txt should still be in working tree
    expect(result.newState.workingTree.files['c.txt']).toBeDefined();
  });

  it('should handle staging a deleted file', () => {
    const state: RepoState = {
      ...createStateWithCommit('init', { 'old.txt': 'old content' }),
      workingTree: {
        files: {
          'old.txt': { status: 'deleted', content: '' },
        },
      },
    };

    const result = add(['old.txt'], {}, state);
    expect(result.success).toBe(true);
    expect(result.newState.index['old.txt']).toBe('__DELETED__');
    expect(result.newState.workingTree.files['old.txt']).toBeUndefined();
  });

  it('should return error when file does not exist in working tree', () => {
    const state = createStateWithCommit('init');
    const result = add(['nonexistent.txt'], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('No matching files');
  });

  it('should not modify state when staging fails', () => {
    const state = createStateWithCommit('init');
    const result = add([], {}, state);
    expect(result.newState).toBe(state);
  });
});
