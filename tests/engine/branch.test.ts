// tests/engine/branch.test.ts — Unit tests for git branch command

import { describe, it, expect } from 'vitest';

import { branch } from '../../src/engine/commands/branch';
import { createStateWithCommit } from './helpers';
import type { RepoState } from '../../src/engine/types';

describe('git branch', () => {
  describe('list branches', () => {
    it('should list all branches with current branch marked', () => {
      const state = createStateWithCommit();
      const result = branch([], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toBe('* main');
    });

    it('should list multiple branches sorted alphabetically', () => {
      const state = createStateWithCommit();
      const stateWithBranches: RepoState = {
        ...state,
        branches: {
          ...state.branches,
          develop: state.branches['main']!,
          feature: state.branches['main']!,
        },
      };
      const result = branch([], {}, stateWithBranches);
      expect(result.success).toBe(true);
      expect(result.output).toContain('  develop');
      expect(result.output).toContain('  feature');
      expect(result.output).toContain('* main');
    });
  });

  describe('create branch', () => {
    it('should create a new branch at HEAD', () => {
      const state = createStateWithCommit();
      const result = branch(['develop'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.branches['develop']).toBe(
        state.branches['main'],
      );
    });

    it('should fail if branch already exists', () => {
      const state = createStateWithCommit();
      const result = branch(['main'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('already exists');
    });

    it('should fail if no commits exist', () => {
      const state = createStateWithCommit();
      const emptyState: RepoState = {
        ...state,
        branches: { main: '' },
        commits: {},
      };
      // resolveHead returns empty string which is falsy
      const result = branch(['develop'], {}, emptyState);
      expect(result.success).toBe(false);
      expect(result.output).toContain('no commits');
    });
  });

  describe('delete branch', () => {
    it('should delete an existing branch with -d flag', () => {
      const state = createStateWithCommit();
      const stateWithBranch: RepoState = {
        ...state,
        branches: {
          ...state.branches,
          develop: state.branches['main']!,
        },
      };
      const result = branch(['develop'], { d: true }, stateWithBranch);
      expect(result.success).toBe(true);
      expect(result.newState.branches['develop']).toBeUndefined();
      expect(result.output).toContain('Deleted branch develop');
    });

    it('should fail if branch does not exist', () => {
      const state = createStateWithCommit();
      const result = branch(['nonexistent'], { d: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('not found');
    });

    it('should fail if trying to delete current branch', () => {
      const state = createStateWithCommit();
      const result = branch(['main'], { d: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('Cannot delete');
    });

    it('should require a branch name for deletion', () => {
      const state = createStateWithCommit();
      const result = branch([], { d: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('branch name required');
    });
  });
});
