// tests/levels/winCondition.test.ts — Unit tests for win condition checker

import { describe, it, expect } from 'vitest';

import { checkWinCondition } from '../../src/levels/winCondition';
import type { TargetStateSpec } from '../../src/levels/schema';
import type { RepoState, Commit } from '../../src/engine/types';

/** Helper: create a commit object */
function makeCommit(
  hash: string,
  message: string,
  parentHashes: string[] = [],
): Commit {
  return {
    hash,
    message,
    parentHashes,
    tree: {},
    timestamp: 1000000,
  };
}

/** Helper: create a minimal repo state for win condition testing */
function makeState(overrides: Partial<RepoState> = {}): RepoState {
  const commit = makeCommit('a1b2c3f', 'initial commit');
  return {
    commits: { [commit.hash]: commit },
    branches: { main: commit.hash },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
    reflog: [],
    ...overrides,
  };
}

/**
 * Helper: create a starting state where branches haven't been touched yet.
 * By default, main points to a different hash than makeState() so that
 * "branch has advanced" checks pass. Use overrides to test specific scenarios.
 */
function makeStartingState(overrides: Partial<RepoState> = {}): RepoState {
  const commit = makeCommit('0000000', 'starting commit');
  return {
    commits: { [commit.hash]: commit },
    branches: { main: commit.hash },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
    reflog: [],
    ...overrides,
  };
}

describe('checkWinCondition', () => {
  describe('branch matching', () => {
    it('should pass when target branch exists and has advanced', () => {
      const state = makeState();
      const startingState = makeStartingState(); // main at '0000000', state main at 'a1b2c3f'
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should fail when a target branch does not exist', () => {
      const state = makeState();
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main', 'develop'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should fail when branch exists but has not advanced from starting state', () => {
      const commit = makeCommit('a1b2c3f', 'initial commit');
      const state = makeState();
      // Starting state has the SAME hash for main — branch hasn't advanced
      const startingState = makeStartingState({
        branches: { main: commit.hash },
      });
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should pass when branch exists and has advanced from starting state', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial commit');
      const commit2 = makeCommit('b2c3d4e', 'new work', ['a1b2c3f']);
      const state = makeState({
        commits: { [commit1.hash]: commit1, [commit2.hash]: commit2 },
        branches: { main: commit2.hash },
      });
      // Starting state had main at commit1
      const startingState = makeStartingState({
        branches: { main: commit1.hash },
      });
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should pass when branch did not exist at start and now exists', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial commit');
      const commit2 = makeCommit('b2c3d4e', 'feature work', ['a1b2c3f']);
      const state = makeState({
        commits: { [commit1.hash]: commit1, [commit2.hash]: commit2 },
        branches: { main: commit1.hash, 'feature/login': commit2.hash },
      });
      // Starting state has no 'feature/login' branch
      const startingState = makeStartingState({
        branches: { main: '0000000' },
      });
      const target: TargetStateSpec = {
        branches: ['feature/login'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should pass when multiple target branches all exist and have advanced', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial commit');
      const commit2 = makeCommit('b2c3d4e', 'add feature', ['a1b2c3f']);
      const state = makeState({
        commits: {
          [commit1.hash]: commit1,
          [commit2.hash]: commit2,
        },
        branches: { main: commit2.hash, develop: commit2.hash },
      });
      const startingState = makeStartingState({
        branches: { main: commit1.hash, develop: commit1.hash },
      });
      const target: TargetStateSpec = {
        branches: ['main', 'develop'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should allow extra branches not in the target', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial commit');
      const state = makeState({
        branches: { main: commit1.hash, extra: commit1.hash },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should pass regardless of commit message at branch tip', () => {
      const commit = makeCommit('a1b2c3f', 'any message whatsoever');
      const state = makeState({
        commits: { [commit.hash]: commit },
        branches: { main: commit.hash },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });
  });

  describe('remote branch matching', () => {
    it('should pass when remote branches exist and have advanced', () => {
      const commit = makeCommit('a1b2c3f', 'initial commit');
      const state = makeState({
        remote: { name: 'origin', branches: { main: commit.hash } },
      });
      // Remote branch didn't exist at start — so just needs to exist
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        remoteBranches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should fail when target remote branch does not exist', () => {
      const state = makeState();
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        remoteBranches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should fail when remote branch exists but has not advanced from starting state', () => {
      const commit = makeCommit('a1b2c3f', 'initial commit');
      const state = makeState({
        remote: { name: 'origin', branches: { main: commit.hash } },
      });
      // Starting state had the SAME remote hash
      const startingState = makeStartingState({
        remote: { name: 'origin', branches: { main: commit.hash } },
      });
      const target: TargetStateSpec = {
        branches: ['main'],
        remoteBranches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should pass when remote branch has advanced from starting state', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial commit');
      const commit2 = makeCommit('b2c3d4e', 'pushed work', ['a1b2c3f']);
      const state = makeState({
        commits: { [commit1.hash]: commit1, [commit2.hash]: commit2 },
        branches: { main: commit2.hash },
        remote: { name: 'origin', branches: { main: commit2.hash } },
      });
      const startingState = makeStartingState({
        branches: { main: commit1.hash },
        remote: { name: 'origin', branches: { main: commit1.hash } },
      });
      const target: TargetStateSpec = {
        branches: ['main'],
        remoteBranches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should skip remote branch check when remoteBranches is not specified', () => {
      const state = makeState();
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });
  });

  describe('HEAD matching', () => {
    it('should pass when HEAD points to correct branch', () => {
      const state = makeState({
        head: { type: 'branch', name: 'develop' },
        branches: { main: 'a1b2c3f', develop: 'a1b2c3f' },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'develop' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should fail when HEAD points to wrong branch', () => {
      const state = makeState({
        head: { type: 'branch', name: 'main' },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'develop' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should fail when HEAD type does not match (branch vs detached)', () => {
      const state = makeState({
        head: { type: 'detached', hash: 'a1b2c3f' },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should pass when detached HEAD matches expected hash', () => {
      const state = makeState({
        head: { type: 'detached', hash: 'a1b2c3f' },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'detached', hash: 'a1b2c3f' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });
  });

  describe('working tree cleanliness', () => {
    it('should pass when workingTreeClean is true and tree is clean', () => {
      const state = makeState();
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should fail when workingTreeClean is true but has staged changes', () => {
      const state = makeState({
        index: { 'file.txt': 'content' },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should fail when workingTreeClean is true but has modified files', () => {
      const state = makeState({
        workingTree: {
          files: {
            'file.txt': { status: 'modified', content: 'changed' },
          },
        },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should fail when workingTreeClean is true but has untracked files', () => {
      const state = makeState({
        workingTree: {
          files: {
            'new.txt': { status: 'untracked', content: 'new file' },
          },
        },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should fail when workingTreeClean is true but has conflicted files', () => {
      const state = makeState({
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
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should pass when workingTreeClean is false even with dirty tree', () => {
      const state = makeState({
        index: { 'file.txt': 'content' },
        workingTree: {
          files: {
            'file.txt': { status: 'modified', content: 'changed' },
          },
        },
      });
      const startingState = makeStartingState();
      const target: TargetStateSpec = {
        branches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: false,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });
  });

  describe('combined scenarios', () => {
    it('should pass for level 1-01 after player commits and pushes', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial project setup');
      const commit2 = makeCommit('9f8e7d6', 'add README', ['a1b2c3f']);
      const state: RepoState = {
        commits: {
          [commit1.hash]: commit1,
          [commit2.hash]: commit2,
        },
        branches: { main: commit2.hash },
        head: { type: 'branch', name: 'main' },
        index: {},
        workingTree: { files: {} },
        remote: { name: 'origin', branches: { main: commit2.hash } },
        stash: [],
        reflog: [],
      };
      // Starting state: main and origin/main both at commit1
      const startingState: RepoState = {
        commits: { [commit1.hash]: commit1 },
        branches: { main: commit1.hash },
        head: { type: 'branch', name: 'main' },
        index: {},
        workingTree: { files: {} },
        remote: { name: 'origin', branches: { main: commit1.hash } },
        stash: [],
        reflog: [],
      };
      const target: TargetStateSpec = {
        branches: ['main'],
        remoteBranches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      expect(checkWinCondition(state, target, startingState)).toBe(true);
    });

    it('should fail level 1-01 at starting state (nothing done yet)', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial project setup');
      // State is identical to starting state — player hasn't done anything
      const state: RepoState = {
        commits: { [commit1.hash]: commit1 },
        branches: { main: commit1.hash },
        head: { type: 'branch', name: 'main' },
        index: {},
        workingTree: { files: {} },
        remote: { name: 'origin', branches: { main: commit1.hash } },
        stash: [],
        reflog: [],
      };
      const startingState: RepoState = { ...state };
      const target: TargetStateSpec = {
        branches: ['main'],
        remoteBranches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      // Branches haven't advanced — should fail
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });

    it('should fail level 1-01 when committed but push is missing', () => {
      const commit1 = makeCommit('a1b2c3f', 'initial project setup');
      const commit2 = makeCommit('9f8e7d6', 'add README', ['a1b2c3f']);
      const state: RepoState = {
        commits: {
          [commit1.hash]: commit1,
          [commit2.hash]: commit2,
        },
        branches: { main: commit2.hash },
        head: { type: 'branch', name: 'main' },
        index: {},
        workingTree: { files: {} },
        // Remote still at starting position
        remote: { name: 'origin', branches: { main: commit1.hash } },
        stash: [],
        reflog: [],
      };
      const startingState: RepoState = {
        commits: { [commit1.hash]: commit1 },
        branches: { main: commit1.hash },
        head: { type: 'branch', name: 'main' },
        index: {},
        workingTree: { files: {} },
        remote: { name: 'origin', branches: { main: commit1.hash } },
        stash: [],
        reflog: [],
      };
      const target: TargetStateSpec = {
        branches: ['main'],
        remoteBranches: ['main'],
        head: { type: 'branch', name: 'main' },
        workingTreeClean: true,
      };
      // Local main advanced but remote main hasn't
      expect(checkWinCondition(state, target, startingState)).toBe(false);
    });
  });
});
