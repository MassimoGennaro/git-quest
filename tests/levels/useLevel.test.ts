// tests/levels/useLevel.test.ts — Tests for getVisibleMessages and computeScore

import { describe, expect, it } from 'vitest';

import type { SlackMessage } from '@/levels/schema';
import { computeScore, getVisibleMessages } from '@/hooks/useLevel';

// ─── Helper ────────────────────────────────────────────────────────────

function mkMsg(
  overrides: Partial<SlackMessage> & Pick<SlackMessage, 'trigger'>,
): SlackMessage {
  return {
    from: 'alex',
    text: 'test message',
    ...overrides,
  };
}

// ─── computeScore ──────────────────────────────────────────────────────

describe('computeScore', () => {
  it('returns 3 stars at par', () => {
    expect(computeScore(3, 3)).toBe(3);
  });

  it('returns 3 stars under par', () => {
    expect(computeScore(2, 3)).toBe(3);
  });

  it('returns 2 stars at par+1', () => {
    expect(computeScore(4, 3)).toBe(2);
  });

  it('returns 2 stars at par+2', () => {
    expect(computeScore(5, 3)).toBe(2);
  });

  it('returns 1 star at par+3', () => {
    expect(computeScore(6, 3)).toBe(1);
  });

  it('returns 1 star well over par', () => {
    expect(computeScore(20, 3)).toBe(1);
  });
});

// ─── getVisibleMessages ────────────────────────────────────────────────

describe('getVisibleMessages', () => {
  // ── level_start ────────────────────────────────────────────────────

  it('always shows level_start messages', () => {
    const msgs = [mkMsg({ trigger: { type: 'level_start' } })];
    const result = getVisibleMessages(msgs, [], new Set(), 0, false);
    expect(result).toEqual(msgs);
  });

  // ── after_command ──────────────────────────────────────────────────

  it('shows after_command when command has been executed', () => {
    const msgs = [
      mkMsg({ trigger: { type: 'after_command', command: 'push' } }),
    ];
    const result = getVisibleMessages(msgs, ['push'], new Set(), 0, false);
    expect(result).toEqual(msgs);
  });

  it('hides after_command when command has not been executed', () => {
    const msgs = [
      mkMsg({ trigger: { type: 'after_command', command: 'push' } }),
    ];
    const result = getVisibleMessages(msgs, ['add'], new Set(), 0, false);
    expect(result).toEqual([]);
  });

  // ── after_command_without ──────────────────────────────────────────

  it('shows after_command_without when command used but without-command not used', () => {
    const msgs = [
      mkMsg({
        trigger: {
          type: 'after_command_without',
          command: 'add',
          without: 'stash',
        },
        variant: 'warning',
      }),
    ];
    const result = getVisibleMessages(msgs, ['add'], new Set(), 0, false);
    expect(result).toEqual(msgs);
  });

  it('hides after_command_without when without-command has been used', () => {
    const msgs = [
      mkMsg({
        trigger: {
          type: 'after_command_without',
          command: 'add',
          without: 'stash',
        },
        variant: 'warning',
      }),
    ];
    const result = getVisibleMessages(
      msgs,
      ['stash', 'add'],
      new Set(),
      0,
      false,
    );
    expect(result).toEqual([]);
  });

  it('hides after_command_without when the command itself has not been used', () => {
    const msgs = [
      mkMsg({
        trigger: {
          type: 'after_command_without',
          command: 'merge',
          without: 'stash',
        },
        variant: 'warning',
      }),
    ];
    const result = getVisibleMessages(
      msgs,
      ['commit'],
      new Set(),
      0,
      false,
    );
    expect(result).toEqual([]);
  });

  it('hides after_command_without when neither command has been used', () => {
    const msgs = [
      mkMsg({
        trigger: {
          type: 'after_command_without',
          command: 'push',
          without: 'rebase',
        },
        variant: 'warning',
      }),
    ];
    const result = getVisibleMessages(msgs, [], new Set(), 0, false);
    expect(result).toEqual([]);
  });

  // ── after_branch_created ───────────────────────────────────────────

  it('shows after_branch_created when branch exists', () => {
    const msgs = [
      mkMsg({
        trigger: { type: 'after_branch_created', name: 'feature/x' },
      }),
    ];
    const result = getVisibleMessages(
      msgs,
      [],
      new Set(['feature/x']),
      0,
      false,
    );
    expect(result).toEqual(msgs);
  });

  it('hides after_branch_created when branch does not exist', () => {
    const msgs = [
      mkMsg({
        trigger: { type: 'after_branch_created', name: 'feature/x' },
      }),
    ];
    const result = getVisibleMessages(msgs, [], new Set(), 0, false);
    expect(result).toEqual([]);
  });

  // ── after_commit ───────────────────────────────────────────────────

  it('shows after_commit when commitCount > 0', () => {
    const msgs = [mkMsg({ trigger: { type: 'after_commit' } })];
    const result = getVisibleMessages(msgs, [], new Set(), 1, false);
    expect(result).toEqual(msgs);
  });

  it('hides after_commit when commitCount is 0', () => {
    const msgs = [mkMsg({ trigger: { type: 'after_commit' } })];
    const result = getVisibleMessages(msgs, [], new Set(), 0, false);
    expect(result).toEqual([]);
  });

  // ── conflict_triggered ─────────────────────────────────────────────

  it('shows conflict_triggered when hasConflicts is true', () => {
    const msgs = [mkMsg({ trigger: { type: 'conflict_triggered' } })];
    const result = getVisibleMessages(msgs, [], new Set(), 0, true);
    expect(result).toEqual(msgs);
  });

  it('hides conflict_triggered when hasConflicts is false', () => {
    const msgs = [mkMsg({ trigger: { type: 'conflict_triggered' } })];
    const result = getVisibleMessages(msgs, [], new Set(), 0, false);
    expect(result).toEqual([]);
  });

  // ── Mixed thread scenario ──────────────────────────────────────────

  it('filters a realistic thread correctly', () => {
    const thread: SlackMessage[] = [
      mkMsg({
        from: 'sarah',
        text: 'stash first',
        trigger: { type: 'level_start' },
      }),
      mkMsg({
        from: 'sarah',
        text: 'you should stash first!',
        trigger: {
          type: 'after_command_without',
          command: 'merge',
          without: 'stash',
        },
        variant: 'warning',
      }),
      mkMsg({
        from: 'alex',
        text: 'merge done!',
        trigger: { type: 'after_command', command: 'merge' },
      }),
      mkMsg({
        from: 'marcus',
        text: 'push it',
        trigger: { type: 'after_command', command: 'push' },
      }),
    ];

    // Player merged without stashing: should see level_start, warning, and merge msg
    const result1 = getVisibleMessages(
      thread,
      ['merge'],
      new Set(),
      0,
      false,
    );
    expect(result1).toHaveLength(3);
    expect(result1.map((m) => m.text)).toEqual([
      'stash first',
      'you should stash first!',
      'merge done!',
    ]);
    expect(result1.find((m) => m.variant === 'warning')?.text).toBe(
      'you should stash first!',
    );

    // Player stashed then merged: warning should disappear
    const result2 = getVisibleMessages(
      thread,
      ['stash', 'merge'],
      new Set(),
      0,
      false,
    );
    expect(result2).toHaveLength(2);
    expect(result2.map((m) => m.text)).toEqual([
      'stash first',
      'merge done!',
    ]);

    // Player stashed, merged, and pushed: all non-warning messages visible
    const result3 = getVisibleMessages(
      thread,
      ['stash', 'merge', 'push'],
      new Set(),
      0,
      false,
    );
    expect(result3).toHaveLength(3);
    expect(result3.every((m) => m.variant !== 'warning')).toBe(true);
  });
});
