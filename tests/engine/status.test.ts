// tests/engine/status.test.ts — Unit tests for git status command

import { describe, it, expect } from 'vitest';
import { status } from '../../src/engine/commands/status';
import { createStateWithCommit } from './helpers';
import type { RepoState } from '../../src/engine/types';

describe('git status', () => {
  it('should show branch name when HEAD is attached', () => {
    const state = createStateWithCommit('init');
    const result = status([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('On branch main');
  });

  it('should show detached HEAD message', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      head: { type: 'detached', hash: 'a1b2c3f' },
    };
    const result = status([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('HEAD detached at a1b2c3f');
  });

  it('should show clean working tree message', () => {
    const state = createStateWithCommit('init');
    const result = status([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('nothing to commit, working tree clean');
  });

  it('should list staged files', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'README.md': '# Hello' },
    };
    const result = status([], {}, state);
    expect(result.output).toContain('Changes to be committed');
    expect(result.output).toContain('new file:   README.md');
  });

  it('should list multiple staged files sorted', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'b.txt': 'b', 'a.txt': 'a' },
    };
    const result = status([], {}, state);
    const aIndex = result.output.indexOf('a.txt');
    const bIndex = result.output.indexOf('b.txt');
    expect(aIndex).toBeLessThan(bIndex);
  });

  it('should list modified files', () => {
    const state: RepoState = {
      ...createStateWithCommit('init', { 'config.js': 'old' }),
      workingTree: {
        files: {
          'config.js': { status: 'modified', content: 'new' },
        },
      },
    };
    const result = status([], {}, state);
    expect(result.output).toContain('Changes not staged for commit');
    expect(result.output).toContain('modified:   config.js');
  });

  it('should list untracked files', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      workingTree: {
        files: {
          'notes.txt': { status: 'untracked', content: 'notes' },
        },
      },
    };
    const result = status([], {}, state);
    expect(result.output).toContain('Untracked files');
    expect(result.output).toContain('notes.txt');
  });

  it('should list deleted files', () => {
    const state: RepoState = {
      ...createStateWithCommit('init', { 'old.txt': 'content' }),
      workingTree: {
        files: {
          'old.txt': { status: 'deleted', content: '' },
        },
      },
    };
    const result = status([], {}, state);
    expect(result.output).toContain('deleted:    old.txt');
  });

  it('should list conflicted files', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      workingTree: {
        files: {
          'config.js': {
            status: 'conflicted',
            content: '',
            conflictOurs: 'timeout: 5000',
            conflictTheirs: 'timeout: 3000',
          },
        },
      },
    };
    const result = status([], {}, state);
    expect(result.output).toContain('Unmerged paths');
    expect(result.output).toContain('both modified:   config.js');
  });

  it('should show all sections when there are staged, modified, and untracked files', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'staged.txt': 'staged' },
      workingTree: {
        files: {
          'modified.js': { status: 'modified', content: 'mod' },
          'new.txt': { status: 'untracked', content: 'new' },
        },
      },
    };
    const result = status([], {}, state);
    expect(result.output).toContain('Changes to be committed');
    expect(result.output).toContain('Changes not staged for commit');
    expect(result.output).toContain('Untracked files');
  });

  it('should not show "nothing to commit" when there are changes', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'file.txt': 'content' },
    };
    const result = status([], {}, state);
    expect(result.output).not.toContain('nothing to commit');
  });

  it('should never mutate the state', () => {
    const state = createStateWithCommit('init');
    const result = status([], {}, state);
    expect(result.newState).toBe(state);
  });
});
