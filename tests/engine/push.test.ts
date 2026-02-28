// tests/engine/push.test.ts — Unit tests for git push command

import { describe, it, expect } from 'vitest';

import { push } from '../../src/engine/commands/push';
import { createStateWithCommit } from './helpers';
import type { RepoState } from '../../src/engine/types';

describe('git push', () => {
  describe('push current branch', () => {
    it('should update remote branch to match local', () => {
      const state = createStateWithCommit();
      // Local main is at a1b2c3f, remote main is also at a1b2c3f
      // Let's simulate local being ahead
      const aheadState: RepoState = {
        ...state,
        branches: { main: 'new1234' },
        commits: {
          ...state.commits,
          new1234: {
            hash: 'new1234',
            message: 'new commit',
            parentHashes: ['a1b2c3f'],
            tree: {},
            timestamp: 2000000,
          },
        },
      };
      const result = push([], {}, aheadState);
      expect(result.success).toBe(true);
      expect(result.newState.remote.branches['main']).toBe('new1234');
    });

    it('should report everything up-to-date when already synced', () => {
      const state = createStateWithCommit();
      // state already has remote main = local main = a1b2c3f
      const result = push([], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Everything up-to-date');
    });
  });

  describe('push with remote and branch args', () => {
    it('should push specified branch with git push origin <branch>', () => {
      const state = createStateWithCommit();
      const stateWithFeature: RepoState = {
        ...state,
        branches: {
          ...state.branches,
          feature: 'a1b2c3f',
        },
        head: { type: 'branch', name: 'feature' },
      };
      const result = push(['origin', 'feature'], {}, stateWithFeature);
      expect(result.success).toBe(true);
      expect(result.newState.remote.branches['feature']).toBe('a1b2c3f');
      expect(result.output).toContain('feature -> feature');
    });

    it('should fail if specified branch does not exist', () => {
      const state = createStateWithCommit();
      const result = push(['origin', 'nonexistent'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('does not match any');
    });
  });

  describe('push with just remote name', () => {
    it('should push current branch when only remote is specified', () => {
      const state = createStateWithCommit();
      const aheadState: RepoState = {
        ...state,
        branches: { main: 'new1234' },
        commits: {
          ...state.commits,
          new1234: {
            hash: 'new1234',
            message: 'new commit',
            parentHashes: ['a1b2c3f'],
            tree: {},
            timestamp: 2000000,
          },
        },
      };
      const result = push(['origin'], {}, aheadState);
      expect(result.success).toBe(true);
      expect(result.newState.remote.branches['main']).toBe('new1234');
    });
  });

  describe('error cases', () => {
    it('should fail in detached HEAD state', () => {
      const state = createStateWithCommit();
      const detachedState: RepoState = {
        ...state,
        head: { type: 'detached', hash: 'a1b2c3f' },
      };
      const result = push([], {}, detachedState);
      expect(result.success).toBe(false);
      expect(result.output).toContain('not currently on a branch');
    });
  });
});
