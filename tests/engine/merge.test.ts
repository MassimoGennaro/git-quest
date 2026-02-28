// tests/engine/merge.test.ts — Unit tests for git merge command

import { describe, it, expect } from 'vitest';

import { merge } from '../../src/engine/commands/merge';
import type { RepoState, Commit } from '../../src/engine/types';

/** Helper: create a commit object */
function makeCommit(
  hash: string,
  message: string,
  parentHashes: string[] = [],
  files: Record<string, string> = {},
): Commit {
  const tree: Record<string, { content: string }> = {};
  for (const [name, content] of Object.entries(files)) {
    tree[name] = { content };
  }
  return { hash, message, parentHashes, tree, timestamp: 1000000 };
}

/** Helper: create a state with a linear history and two branches */
function createFastForwardState(): RepoState {
  const commit1 = makeCommit('aaa0001', 'initial commit', [], {
    'index.js': 'console.log("hello")',
  });
  const commit2 = makeCommit('bbb0002', 'add feature', ['aaa0001'], {
    'index.js': 'console.log("hello")',
    'feature.js': 'export default {}',
  });
  const commit3 = makeCommit('ccc0003', 'improve feature', ['bbb0002'], {
    'index.js': 'console.log("hello")',
    'feature.js': 'export default { name: "feature" }',
  });

  return {
    commits: {
      [commit1.hash]: commit1,
      [commit2.hash]: commit2,
      [commit3.hash]: commit3,
    },
    branches: {
      main: 'aaa0001',
      feature: 'ccc0003',
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
  };
}

/** Helper: create a state with diverging branches (for three-way merge) */
function createDivergentState(): RepoState {
  const ancestor = makeCommit('aaa0001', 'initial commit', [], {
    'config.js': 'timeout: 1000',
    'shared.js': 'shared code',
  });
  const oursCommit = makeCommit('bbb0002', 'update shared', ['aaa0001'], {
    'config.js': 'timeout: 1000',
    'shared.js': 'updated shared code',
  });
  const theirsCommit = makeCommit('ccc0003', 'add feature', ['aaa0001'], {
    'config.js': 'timeout: 1000',
    'shared.js': 'shared code',
    'feature.js': 'new feature',
  });

  return {
    commits: {
      [ancestor.hash]: ancestor,
      [oursCommit.hash]: oursCommit,
      [theirsCommit.hash]: theirsCommit,
    },
    branches: {
      main: 'bbb0002',
      feature: 'ccc0003',
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
  };
}

/** Helper: create a state with conflicting changes */
function createConflictState(): RepoState {
  const ancestor = makeCommit('aaa0001', 'initial config', [], {
    'config.js': 'timeout: 1000',
  });
  const oursCommit = makeCommit(
    'bbb0002',
    'update timeout to 5000',
    ['aaa0001'],
    { 'config.js': 'timeout: 5000' },
  );
  const theirsCommit = makeCommit(
    'ccc0003',
    'fix retry logic',
    ['aaa0001'],
    { 'config.js': 'timeout: 3000' },
  );

  return {
    commits: {
      [ancestor.hash]: ancestor,
      [oursCommit.hash]: oursCommit,
      [theirsCommit.hash]: theirsCommit,
    },
    branches: {
      'feature/auth': 'bbb0002',
      develop: 'ccc0003',
    },
    head: { type: 'branch', name: 'develop' },
    index: {},
    workingTree: { files: {} },
    remote: { name: 'origin', branches: {} },
    stash: [],
  };
}

describe('git merge', () => {
  describe('fast-forward merge', () => {
    it('should fast-forward when current branch is ancestor of target', () => {
      const state = createFastForwardState();
      const result = merge(['feature'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Fast-forward');
      expect(result.newState.branches['main']).toBe('ccc0003');
    });

    it('should report already up to date when branches point to same commit', () => {
      const state = createFastForwardState();
      const sameState: RepoState = {
        ...state,
        branches: { main: 'ccc0003', feature: 'ccc0003' },
      };
      const result = merge(['feature'], {}, sameState);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Already up to date');
    });

    it('should report already up to date when target is ancestor of current', () => {
      const state = createFastForwardState();
      const aheadState: RepoState = {
        ...state,
        branches: { main: 'ccc0003', feature: 'aaa0001' },
      };
      const result = merge(['feature'], {}, aheadState);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Already up to date');
    });
  });

  describe('three-way merge (no conflicts)', () => {
    it('should create a merge commit when branches have diverged', () => {
      const state = createDivergentState();
      const result = merge(['feature'], {}, state);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Merge');

      // The merge commit should have two parents
      const mergeHash = result.newState.branches['main']!;
      const mergeCommit = result.newState.commits[mergeHash]!;
      expect(mergeCommit.parentHashes).toHaveLength(2);
      expect(mergeCommit.parentHashes).toContain('bbb0002');
      expect(mergeCommit.parentHashes).toContain('ccc0003');
    });

    it('should include files from both branches in the merge commit', () => {
      const state = createDivergentState();
      const result = merge(['feature'], {}, state);
      const mergeHash = result.newState.branches['main']!;
      const mergeCommit = result.newState.commits[mergeHash]!;

      // Should have our updated shared.js and their new feature.js
      expect(mergeCommit.tree['shared.js']?.content).toBe(
        'updated shared code',
      );
      expect(mergeCommit.tree['feature.js']?.content).toBe('new feature');
      expect(mergeCommit.tree['config.js']?.content).toBe('timeout: 1000');
    });
  });

  describe('conflict detection', () => {
    it('should detect conflicts when both sides modify the same file', () => {
      const state = createConflictState();
      const result = merge(['feature/auth'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('CONFLICT');
      expect(result.output).toContain('config.js');
    });

    it('should set conflicted files in working tree', () => {
      const state = createConflictState();
      const result = merge(['feature/auth'], {}, state);
      const conflictedFile =
        result.newState.workingTree.files['config.js'];
      expect(conflictedFile).toBeDefined();
      expect(conflictedFile!.status).toBe('conflicted');
      expect(conflictedFile!.conflictOurs).toBe('timeout: 3000');
      expect(conflictedFile!.conflictTheirs).toBe('timeout: 5000');
    });

    it('should return conflictsTriggered with conflict details', () => {
      const state = createConflictState();
      const result = merge(['feature/auth'], {}, state);
      expect(result.conflictsTriggered).toBeDefined();
      expect(result.conflictsTriggered!['config.js']).toBeDefined();
      expect(result.conflictsTriggered!['config.js']!.ours).toBe(
        'timeout: 3000',
      );
      expect(result.conflictsTriggered!['config.js']!.theirs).toBe(
        'timeout: 5000',
      );
    });

    it('should store ancestor content in conflicted working file', () => {
      const state = createConflictState();
      const result = merge(['feature/auth'], {}, state);
      const conflictedFile =
        result.newState.workingTree.files['config.js'];
      expect(conflictedFile).toBeDefined();
      expect(conflictedFile!.conflictAncestor).toBe('timeout: 1000');
    });
  });

  describe('error cases', () => {
    it('should fail with no branch specified', () => {
      const state = createFastForwardState();
      const result = merge([], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('No branch specified');
    });

    it('should fail if target branch does not exist', () => {
      const state = createFastForwardState();
      const result = merge(['nonexistent'], {}, state);
      expect(result.success).toBe(false);
      expect(result.output).toContain('not something we can merge');
    });

    it('should fail in detached HEAD state', () => {
      const state = createFastForwardState();
      const detachedState: RepoState = {
        ...state,
        head: { type: 'detached', hash: 'aaa0001' },
      };
      const result = merge(['feature'], {}, detachedState);
      expect(result.success).toBe(false);
      expect(result.output).toContain('detached HEAD');
    });
  });
});
