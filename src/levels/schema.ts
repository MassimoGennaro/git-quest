// levels/schema.ts — Type definitions for level scenarios

import type { HeadState, RepoState } from '@/engine/types';

/** Trigger condition for when a Slack message should appear */
export type SlackTrigger =
  | { type: 'level_start' }
  | { type: 'after_command'; command: string }
  | { type: 'after_branch_created'; name: string }
  | { type: 'after_commit' }
  | { type: 'conflict_triggered' };

/** A Slack message from a fictional team member */
export interface SlackMessage {
  from: 'alex' | 'sarah' | 'marcus';
  text: string;
  trigger: SlackTrigger;
}

/**
 * Target state specification for win condition checking.
 * Only checks structural properties (branch existence, HEAD, working tree) —
 * commit messages are NOT verified.
 */
export interface TargetStateSpec {
  /** Local branch names that must exist */
  branches: string[];
  /** Remote branch names that must exist (optional) */
  remoteBranches?: string[];
  /** Expected HEAD position */
  head: HeadState;
  /** Whether the working tree must be clean (no staged, modified, or untracked files) */
  workingTreeClean: boolean;
}

/** A complete level definition */
export interface Scenario {
  /** Unique identifier, e.g. "tier1-01-first-commit" */
  id: string;
  /** Difficulty tier (1-4) */
  tier: 1 | 2 | 3 | 4;
  /** Display name, e.g. "First Commit" */
  title: string;
  /** Minimum commands a competent developer needs */
  par: number;
  /** Fully defined initial repo state */
  startingState: RepoState;
  /** What the engine checks for win */
  targetState: TargetStateSpec;
  /** Slack messages, some triggered by player actions */
  slackThread: SlackMessage[];
  /** Optional hints shown on demand */
  hints?: string[];
}
