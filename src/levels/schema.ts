// levels/schema.ts — Type definitions for level scenarios

import type { HeadState, RepoState } from '@/engine/types';

/** Difficulty category, mapped from tier (1=easy, 2=medium, 3=hard, 4=pro) */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'pro';

/** Map tier number to difficulty label */
export const TIER_TO_DIFFICULTY: Record<1 | 2 | 3 | 4, Difficulty> = {
  1: 'easy',
  2: 'medium',
  3: 'hard',
  4: 'pro',
};

/** Human-readable labels for each difficulty */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  pro: 'Pro',
};

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
/** Per-item descriptions shown in the target state overlay */
export interface TargetDescriptions {
  /** Description for each local branch, keyed by branch name */
  branches?: Record<string, string>;
  /** Description for each remote branch, keyed by branch name */
  remoteBranches?: Record<string, string>;
  /** Description for the expected HEAD position */
  head?: string;
  /** Description for the working tree requirement */
  workingTree?: string;
}

export interface TargetStateSpec {
  /** Local branch names that must exist */
  branches: string[];
  /** Remote branch names that must exist (optional) */
  remoteBranches?: string[];
  /** Expected HEAD position */
  head: HeadState;
  /** Whether the working tree must be clean (no staged, modified, or untracked files) */
  workingTreeClean: boolean;
  /** Optional human-readable descriptions for each target requirement */
  descriptions?: TargetDescriptions;
}

/** A complete level definition */
export interface Scenario {
  /** Unique identifier, e.g. "tier1-01-first-commit" */
  id: string;
  /** Difficulty tier (1-4) */
  tier: 1 | 2 | 3 | 4;
  /** Display name, e.g. "First Commit" */
  title: string;
  /** Short description shown in level selector */
  description: string;
  /** Git concepts/commands this level teaches */
  concepts: string[];
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
