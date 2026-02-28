// tests/engine/reflog.test.ts — Tests for the git reflog command

import { describe, it, expect } from 'vitest';
import { reflog } from '../../src/engine/commands/reflog';
import { createStateWithCommit } from './helpers';

describe('git reflog', () => {
  it('should show "No reflog entries" when reflog is empty', () => {
    const state = createStateWithCommit('initial', {});
    const result = reflog([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toBe('No reflog entries.');
  });

  it('should display reflog entries with index and short hash', () => {
    const state = createStateWithCommit('initial', {});
    state.reflog = [
      { hash: 'abc1234', description: 'commit: add feature' },
      { hash: 'def5678', description: 'commit (initial): first commit' },
    ];

    const result = reflog([], {}, state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('abc1234 HEAD@{0}: commit: add feature');
    expect(result.output).toContain(
      'def5678 HEAD@{1}: commit (initial): first commit',
    );
  });

  it('should display entries in order (newest first)', () => {
    const state = createStateWithCommit('initial', {});
    state.reflog = [
      { hash: 'aaa0001', description: 'reset: moving to HEAD~1' },
      { hash: 'bbb0002', description: 'commit: second' },
      { hash: 'ccc0003', description: 'commit: first' },
    ];

    const result = reflog([], {}, state);
    expect(result.success).toBe(true);
    const lines = result.output.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('HEAD@{0}');
    expect(lines[1]).toContain('HEAD@{1}');
    expect(lines[2]).toContain('HEAD@{2}');
  });

  it('should not modify state', () => {
    const state = createStateWithCommit('initial', {});
    state.reflog = [
      { hash: 'abc1234', description: 'commit: test' },
    ];

    const result = reflog([], {}, state);
    expect(result.newState).toBe(state);
  });

  it('should truncate long hashes to 7 chars', () => {
    const state = createStateWithCommit('initial', {});
    state.reflog = [
      { hash: 'abcdef1234567890', description: 'commit: test' },
    ];

    const result = reflog([], {}, state);
    expect(result.output).toContain('abcdef1 HEAD@{0}');
  });
});
