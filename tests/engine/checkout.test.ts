// tests/engine/checkout.test.ts — Unit tests for git checkout command

import { describe, it, expect } from 'vitest';

import { checkout } from '../../src/engine/commands/checkout';
import { createStateWithCommit } from './helpers';
import type { RepoState } from '../../src/engine/types';

/** Helper: create a state with two branches */
function createTwoBranchState(): RepoState {
  const state = createStateWithCommit();
  return {
    ...state,
    branches: {
      ...state.branches,
      develop: state.branches['main']!,
    },
  };
}

describe('git checkout', () => {
  describe('switch to existing branch', () => {
    it('should switch HEAD to the specified branch', () => {
      const state = createTwoBranchState();
      const result = checkout(['develop'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.head).toEqual({
        type: 'branch',
        name: 'develop',
      });
      expect(result.output).toContain("Switched to branch 'develop'");
    });

    it('should report if already on the branch', () => {
      const state = createStateWithCommit();
      const result = checkout(['main'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain("Already on 'main'");
    });

    it('should fail if branch does not exist', () => {
      const state = createStateWithCommit();
      const result = checkout(['nonexistent'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('did not match');
    });

    it('should fail if there are uncommitted changes', () => {
      const state = createTwoBranchState();
      const dirtyState: RepoState = {
        ...state,
        workingTree: {
          files: {
            'file.txt': { status: 'modified', content: 'changed' },
          },
        },
      };
      const result = checkout(['develop'], {}, dirtyState);
      expect(result.success).toBe(false);
      expect(result.output).toContain('local changes would be overwritten');
    });
  });

  describe('create and switch with -b', () => {
    it('should create a new branch and switch to it', () => {
      const state = createStateWithCommit();
      const result = checkout(['feature/new'], { b: true }, state);
      expect(result.success).toBe(true);
      expect(result.newState.head).toEqual({
        type: 'branch',
        name: 'feature/new',
      });
      expect(result.newState.branches['feature/new']).toBe(
        state.branches['main'],
      );
      expect(result.output).toContain("Switched to a new branch 'feature/new'");
    });

    it('should fail if branch already exists with -b', () => {
      const state = createStateWithCommit();
      const result = checkout(['main'], { b: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('already exists');
    });

    it('should fail with -b if there are uncommitted changes', () => {
      const state = createStateWithCommit();
      const dirtyState: RepoState = {
        ...state,
        index: { 'file.txt': 'staged content' },
      };
      const result = checkout(['feature/new'], { b: true }, dirtyState);
      expect(result.success).toBe(false);
      expect(result.output).toContain('local changes would be overwritten');
    });
  });

  describe('detached HEAD', () => {
    it('should switch to detached HEAD when given a commit hash', () => {
      const state = createStateWithCommit();
      const hash = state.branches['main']!;
      const result = checkout([hash], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.head).toEqual({
        type: 'detached',
        hash,
      });
      expect(result.output).toContain('detached HEAD');
    });
  });

  describe('error cases', () => {
    it('should require a branch argument', () => {
      const state = createStateWithCommit();
      const result = checkout([], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('must specify');
    });
  });
});
