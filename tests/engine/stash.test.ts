// tests/engine/stash.test.ts — Tests for the git stash command

import { describe, it, expect } from 'vitest';
import { stash } from '../../src/engine/commands/stash';
import { createStateWithCommit } from './helpers';

describe('git stash', () => {
  describe('stash (push)', () => {
    it('should save working tree changes to stash', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.workingTree.files['file.txt'] = {
        status: 'modified',
        content: 'changed',
      };

      const result = stash([], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Saved working directory');
      expect(result.newState.stash).toHaveLength(1);
      expect(result.newState.workingTree.files).toEqual({});
      expect(result.newState.index).toEqual({});
    });

    it('should save staged changes to stash', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.index['file.txt'] = 'staged content';

      const result = stash([], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(1);
      expect(result.newState.stash[0]!.index['file.txt']).toBe(
        'staged content',
      );
      expect(result.newState.index).toEqual({});
    });

    it('should save both staged and working tree changes', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.index['staged.txt'] = 'staged';
      state.workingTree.files['working.txt'] = {
        status: 'modified',
        content: 'working',
      };

      const result = stash([], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(1);
      expect(result.newState.stash[0]!.index['staged.txt']).toBe('staged');
      expect(
        result.newState.stash[0]!.workingTree.files['working.txt'],
      ).toBeDefined();
    });

    it('should fail when there are no changes', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      const result = stash([], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('No local changes to save');
    });

    it('should push to the top of the stash stack', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.stash = [
        {
          index: {},
          workingTree: { files: {} },
          message: 'existing stash',
        },
      ];
      state.workingTree.files['new.txt'] = {
        status: 'untracked',
        content: 'new',
      };

      const result = stash([], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(2);
      expect(result.newState.stash[0]!.message).toContain('WIP on');
      expect(result.newState.stash[1]!.message).toBe('existing stash');
    });

    it('should work with "push" subcommand', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.index['file.txt'] = 'changed';
      const result = stash(['push'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(1);
    });
  });

  describe('stash pop', () => {
    it('should restore the most recent stash', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.stash = [
        {
          index: { 'file.txt': 'stashed' },
          workingTree: {
            files: {
              'other.txt': { status: 'modified', content: 'modified' },
            },
          },
          message: 'WIP on main',
        },
      ];

      const result = stash(['pop'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(0);
      expect(result.newState.index['file.txt']).toBe('stashed');
      expect(result.newState.workingTree.files['other.txt']).toBeDefined();
    });

    it('should fail when stash is empty', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      const result = stash(['pop'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('No stash entries found');
    });

    it('should only pop the top stash entry', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.stash = [
        {
          index: { 'a.txt': 'first' },
          workingTree: { files: {} },
          message: 'first stash',
        },
        {
          index: { 'b.txt': 'second' },
          workingTree: { files: {} },
          message: 'second stash',
        },
      ];

      const result = stash(['pop'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(1);
      expect(result.newState.stash[0]!.message).toBe('second stash');
      expect(result.newState.index['a.txt']).toBe('first');
    });
  });

  describe('stash apply', () => {
    it('should restore changes but keep the stash entry', () => {
      const state = createStateWithCommit('initial', { 'file.txt': 'hello' });
      state.stash = [
        {
          index: { 'file.txt': 'stashed' },
          workingTree: { files: {} },
          message: 'WIP on main',
        },
      ];

      const result = stash(['apply'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(1); // still there
      expect(result.newState.index['file.txt']).toBe('stashed');
    });

    it('should fail when stash is empty', () => {
      const state = createStateWithCommit('initial', {});
      const result = stash(['apply'], {}, state);
      expect(result.success).toBe(false);
    });
  });

  describe('stash list', () => {
    it('should list all stash entries', () => {
      const state = createStateWithCommit('initial', {});
      state.stash = [
        {
          index: {},
          workingTree: { files: {} },
          message: 'WIP on main',
        },
        {
          index: {},
          workingTree: { files: {} },
          message: 'WIP on feature',
        },
      ];

      const result = stash(['list'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('stash@{0}: WIP on main');
      expect(result.output).toContain('stash@{1}: WIP on feature');
    });

    it('should show empty output for empty stash', () => {
      const state = createStateWithCommit('initial', {});
      const result = stash(['list'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });
  });

  describe('stash drop', () => {
    it('should remove the most recent stash entry', () => {
      const state = createStateWithCommit('initial', {});
      state.stash = [
        {
          index: {},
          workingTree: { files: {} },
          message: 'first',
        },
        {
          index: {},
          workingTree: { files: {} },
          message: 'second',
        },
      ];

      const result = stash(['drop'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.stash).toHaveLength(1);
      expect(result.newState.stash[0]!.message).toBe('second');
    });

    it('should fail when stash is empty', () => {
      const state = createStateWithCommit('initial', {});
      const result = stash(['drop'], {}, state);
      expect(result.success).toBe(false);
    });
  });

  it('should reject unknown subcommands', () => {
    const state = createStateWithCommit('initial', {});
    const result = stash(['foo'], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('unknown subcommand');
  });
});
