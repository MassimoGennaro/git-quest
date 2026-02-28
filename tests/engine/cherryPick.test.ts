// tests/engine/cherryPick.test.ts — Tests for the git cherry-pick command

import { describe, it, expect } from 'vitest';
import { cherryPick } from '../../src/engine/commands/cherryPick';
import type { Commit, RepoState } from '../../src/engine/types';

/**
 * Create a repo with two branches diverged from a common ancestor:
 *
 *   A -- B (main)
 *    \
 *     C -- D (feature)
 */
function createDivergedState(): RepoState {
  const commitA: Commit = {
    hash: 'aaa0001',
    message: 'initial commit',
    parentHashes: [],
    tree: { 'file.txt': { content: 'v1' } },
    timestamp: 1000,
  };
  const commitB: Commit = {
    hash: 'bbb0002',
    message: 'update on main',
    parentHashes: ['aaa0001'],
    tree: { 'file.txt': { content: 'v1' }, 'main.txt': { content: 'main stuff' } },
    timestamp: 2000,
  };
  const commitC: Commit = {
    hash: 'ccc0003',
    message: 'feature work',
    parentHashes: ['aaa0001'],
    tree: { 'file.txt': { content: 'v1' }, 'feature.txt': { content: 'feature v1' } },
    timestamp: 3000,
  };
  const commitD: Commit = {
    hash: 'ddd0004',
    message: 'more feature work',
    parentHashes: ['ccc0003'],
    tree: {
      'file.txt': { content: 'v1' },
      'feature.txt': { content: 'feature v2' },
      'extra.txt': { content: 'extra' },
    },
    timestamp: 4000,
  };

  return {
    commits: {
      aaa0001: commitA,
      bbb0002: commitB,
      ccc0003: commitC,
      ddd0004: commitD,
    },
    branches: { main: 'bbb0002', feature: 'ddd0004' },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
    reflog: [],
  };
}

describe('git cherry-pick', () => {
  it('should fail with no commit specified', () => {
    const state = createDivergedState();
    const result = cherryPick([], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('No commit specified');
  });

  it('should fail with invalid commit hash', () => {
    const state = createDivergedState();
    const result = cherryPick(['nonexistent'], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain("bad revision");
  });

  it('should cherry-pick a commit that adds a new file', () => {
    const state = createDivergedState();
    // Cherry-pick commitC (which adds feature.txt) onto main (at commitB)
    const result = cherryPick(['ccc0003'], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('feature work');

    // The new commit should have main.txt (from B) and feature.txt (from C)
    const newHash = result.newState.branches['main']!;
    const newCommit = result.newState.commits[newHash]!;
    expect(newCommit.message).toBe('feature work');
    expect(newCommit.tree['main.txt']).toBeDefined();
    expect(newCommit.tree['feature.txt']).toBeDefined();
    expect(newCommit.parentHashes).toEqual(['bbb0002']);
  });

  it('should cherry-pick a commit that modifies a file', () => {
    const state = createDivergedState();
    // Cherry-pick D (modifies feature.txt, adds extra.txt) onto main
    // First cherry-pick C to get feature.txt, then D
    const result1 = cherryPick(['ccc0003'], {}, state);
    expect(result1.success).toBe(true);

    const result2 = cherryPick(['ddd0004'], {}, result1.newState);
    expect(result2.success).toBe(true);

    const newHash = result2.newState.branches['main']!;
    const newCommit = result2.newState.commits[newHash]!;
    expect(newCommit.tree['feature.txt']?.content).toBe('feature v2');
    expect(newCommit.tree['extra.txt']?.content).toBe('extra');
  });

  it('should detect conflicts during cherry-pick', () => {
    // Create a scenario where the same file is changed differently
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
      head: { type: 'branch', name: 'main' },
      index: {},
      workingTree: { files: {} },
      remote: { name: 'origin', branches: {} },
      stash: [],
      reflog: [],
    };

    const result = cherryPick(['ccc0003'], {}, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('CONFLICT');
    expect(result.output).toContain('shared.txt');
    expect(result.conflictsTriggered).toBeDefined();
    expect(result.conflictsTriggered!['shared.txt']).toBeDefined();
  });

  it('should add a reflog entry on success', () => {
    const state = createDivergedState();
    const result = cherryPick(['ccc0003'], {}, state);
    expect(result.success).toBe(true);
    expect(result.newState.reflog).toHaveLength(1);
    expect(result.newState.reflog[0]!.description).toContain('cherry-pick');
    expect(result.newState.reflog[0]!.description).toContain('feature work');
  });

  it('should preserve the original commit message', () => {
    const state = createDivergedState();
    const result = cherryPick(['ccc0003'], {}, state);
    expect(result.success).toBe(true);
    const newHash = result.newState.branches['main']!;
    expect(result.newState.commits[newHash]!.message).toBe('feature work');
  });

  it('should resolve branch names as commit refs', () => {
    const state = createDivergedState();
    // Cherry-pick C first so main has feature.txt, then cherry-pick via branch name
    const result1 = cherryPick(['ccc0003'], {}, state);
    expect(result1.success).toBe(true);

    // Now "feature" branch points to ddd0004 — cherry-pick via branch ref
    const result = cherryPick(['feature'], {}, result1.newState);
    expect(result.success).toBe(true);
    expect(result.output).toContain('more feature work');
  });
});
