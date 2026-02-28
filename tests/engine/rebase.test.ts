// tests/engine/rebase.test.ts — Tests for the git rebase command

import { describe, it, expect } from 'vitest';
import { rebase, rebaseApply } from '../../src/engine/commands/rebase';
import type { Commit, RepoState } from '../../src/engine/types';

/**
 * Create a diverged repo:
 *
 *   A -- B -- C (main)
 *    \
 *     D -- E (feature)
 *
 * A = initial, B/C on main, D/E on feature
 */
function createDivergedState(): RepoState {
  const commitA: Commit = {
    hash: 'aaa0001',
    message: 'initial',
    parentHashes: [],
    tree: { 'file.txt': { content: 'v1' } },
    timestamp: 1000,
  };
  const commitB: Commit = {
    hash: 'bbb0002',
    message: 'main update 1',
    parentHashes: ['aaa0001'],
    tree: {
      'file.txt': { content: 'v1' },
      'main.txt': { content: 'main v1' },
    },
    timestamp: 2000,
  };
  const commitC: Commit = {
    hash: 'ccc0003',
    message: 'main update 2',
    parentHashes: ['bbb0002'],
    tree: {
      'file.txt': { content: 'v1' },
      'main.txt': { content: 'main v2' },
    },
    timestamp: 3000,
  };
  const commitD: Commit = {
    hash: 'ddd0004',
    message: 'feature work 1',
    parentHashes: ['aaa0001'],
    tree: {
      'file.txt': { content: 'v1' },
      'feature.txt': { content: 'feat v1' },
    },
    timestamp: 4000,
  };
  const commitE: Commit = {
    hash: 'eee0005',
    message: 'feature work 2',
    parentHashes: ['ddd0004'],
    tree: {
      'file.txt': { content: 'v1' },
      'feature.txt': { content: 'feat v2' },
    },
    timestamp: 5000,
  };

  return {
    commits: {
      aaa0001: commitA,
      bbb0002: commitB,
      ccc0003: commitC,
      ddd0004: commitD,
      eee0005: commitE,
    },
    branches: { main: 'ccc0003', feature: 'eee0005' },
    head: { type: 'branch', name: 'feature' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
    reflog: [],
  };
}

describe('git rebase', () => {
  describe('regular rebase', () => {
    it('should fail with no upstream specified', () => {
      const state = createDivergedState();
      const result = rebase([], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('No upstream branch');
    });

    it('should fail with invalid branch name', () => {
      const state = createDivergedState();
      const result = rebase(['nonexistent'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('invalid upstream');
    });

    it('should fail in detached HEAD state', () => {
      const state = createDivergedState();
      state.head = { type: 'detached', hash: 'eee0005' };
      const result = rebase(['main'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('detached HEAD');
    });

    it('should report up-to-date when same commit', () => {
      const state = createDivergedState();
      state.branches['feature'] = 'ccc0003'; // same as main
      const result = rebase(['main'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('up to date');
    });

    it('should rebase feature onto main', () => {
      const state = createDivergedState();
      const result = rebase(['main'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Successfully rebased');

      // Feature branch should now point to new commits on top of main
      const newFeatureHash = result.newState.branches['feature']!;
      expect(newFeatureHash).not.toBe('eee0005'); // new hash
      expect(newFeatureHash).not.toBe('ccc0003'); // not same as main

      // The new tip should have feature.txt and main.txt
      const newTip = result.newState.commits[newFeatureHash]!;
      expect(newTip.tree['feature.txt']?.content).toBe('feat v2');
      expect(newTip.tree['main.txt']?.content).toBe('main v2');
      expect(newTip.message).toBe('feature work 2');

      // The parent of the new tip should also be a rebased commit
      const parentHash = newTip.parentHashes[0]!;
      const parentCommit = result.newState.commits[parentHash]!;
      expect(parentCommit.message).toBe('feature work 1');
      expect(parentCommit.tree['feature.txt']?.content).toBe('feat v1');
      expect(parentCommit.tree['main.txt']?.content).toBe('main v2');

      // The parent of that should be main's tip
      expect(parentCommit.parentHashes[0]).toBe('ccc0003');
    });

    it('should fast-forward when current is ancestor of target', () => {
      const state = createDivergedState();
      // Set feature to point to A (ancestor of main)
      state.branches['feature'] = 'aaa0001';
      const result = rebase(['main'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Successfully rebased');
      expect(result.newState.branches['feature']).toBe('ccc0003');
    });

    it('should add reflog entry', () => {
      const state = createDivergedState();
      const result = rebase(['main'], {}, state);
      expect(result.success).toBe(true);
      expect(result.newState.reflog).toHaveLength(1);
      expect(result.newState.reflog[0]!.description).toContain('rebase');
    });

    it('should detect conflicts during rebase', () => {
      // Create scenario where feature changes file.txt differently than main
      const commitA: Commit = {
        hash: 'aaa0001',
        message: 'initial',
        parentHashes: [],
        tree: { 'shared.txt': { content: 'original' } },
        timestamp: 1000,
      };
      const commitB: Commit = {
        hash: 'bbb0002',
        message: 'main change',
        parentHashes: ['aaa0001'],
        tree: { 'shared.txt': { content: 'main version' } },
        timestamp: 2000,
      };
      const commitC: Commit = {
        hash: 'ccc0003',
        message: 'feature change',
        parentHashes: ['aaa0001'],
        tree: { 'shared.txt': { content: 'feature version' } },
        timestamp: 3000,
      };

      const state: RepoState = {
        commits: { aaa0001: commitA, bbb0002: commitB, ccc0003: commitC },
        branches: { main: 'bbb0002', feature: 'ccc0003' },
        head: { type: 'branch', name: 'feature' },
        index: {},
        workingTree: { files: {} },
        remote: { name: 'origin', branches: {} },
        stash: [],
        reflog: [],
      };

      const result = rebase(['main'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('CONFLICT');
      expect(result.output).toContain('shared.txt');
      expect(result.conflictsTriggered).toBeDefined();
    });
  });

  describe('interactive rebase (git rebase -i)', () => {
    it('should fail with no target', () => {
      const state = createDivergedState();
      const result = rebase([], { i: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('No target specified');
    });

    it('should fail with invalid target format', () => {
      const state = createDivergedState();
      const result = rebase(['main'], { i: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('invalid upstream');
    });

    it('should return interactive info for HEAD~2', () => {
      const state = createDivergedState();
      const result = rebase(['HEAD~2'], { i: true }, state);
      expect(result.success).toBe(true);
      expect(result.rebaseInteractive).toBeDefined();
      expect(result.rebaseInteractive!.commits).toHaveLength(2);
      expect(result.rebaseInteractive!.commits[0]!.message).toBe(
        'feature work 1',
      );
      expect(result.rebaseInteractive!.commits[1]!.message).toBe(
        'feature work 2',
      );
      expect(result.rebaseInteractive!.ontoHash).toBe('aaa0001');
    });

    it('should fail when not enough commits', () => {
      const state = createDivergedState();
      const result = rebase(['HEAD~10'], { i: true }, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('not enough commits');
    });
  });

  describe('rebaseApply (interactive rebase execution)', () => {
    it('should pick all commits (no-op rebase)', () => {
      const state = createDivergedState();
      const result = rebaseApply(state, 'aaa0001', [
        { hash: 'ddd0004', action: 'pick' },
        { hash: 'eee0005', action: 'pick' },
      ]);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Successfully rebased');
    });

    it('should drop a commit', () => {
      const state = createDivergedState();
      const result = rebaseApply(state, 'aaa0001', [
        { hash: 'ddd0004', action: 'drop' },
        { hash: 'eee0005', action: 'pick' },
      ]);
      expect(result.success).toBe(true);

      // The new tip should have feature work 2's content but parent should be A
      const newHash = result.newState.branches['feature']!;
      const newCommit = result.newState.commits[newHash]!;
      expect(newCommit.message).toBe('feature work 2');
      expect(newCommit.parentHashes[0]).toBe('aaa0001');
    });

    it('should squash commits', () => {
      const state = createDivergedState();
      const result = rebaseApply(state, 'aaa0001', [
        { hash: 'ddd0004', action: 'squash' },
        { hash: 'eee0005', action: 'pick' },
      ]);
      expect(result.success).toBe(true);

      // Should result in a single commit combining both messages
      const newHash = result.newState.branches['feature']!;
      const newCommit = result.newState.commits[newHash]!;
      expect(newCommit.message).toContain('feature work 1');
      expect(newCommit.message).toContain('feature work 2');
      expect(newCommit.parentHashes[0]).toBe('aaa0001');
    });

    it('should add reflog entry', () => {
      const state = createDivergedState();
      const result = rebaseApply(state, 'aaa0001', [
        { hash: 'ddd0004', action: 'pick' },
        { hash: 'eee0005', action: 'pick' },
      ]);
      expect(result.success).toBe(true);
      expect(result.newState.reflog).toHaveLength(1);
      expect(result.newState.reflog[0]!.description).toContain('rebase');
    });
  });
});
