// hooks/useLevel.ts — Level management hook

import { useMemo } from 'react';

import type { Scenario, SlackMessage } from '@/levels/schema';
import { checkWinCondition } from '@/levels/winCondition';
import { useGitEngine } from './useGitEngine';
import type { GitEngine } from './useGitEngine';

export interface LevelState {
  engine: GitEngine;
  scenario: Scenario;
  isWon: boolean;
  visibleMessages: SlackMessage[];
  score: number;
}

/**
 * Compute the star score based on commands used vs par.
 * 3 stars at par, 2 stars at par+1 or par+2, 1 star at par+3+.
 */
export function computeScore(commandCount: number, par: number): number {
  if (commandCount <= par) return 3;
  if (commandCount <= par + 2) return 2;
  return 1;
}

/**
 * Determine which Slack messages should be visible based on the current
 * engine state and execution history.
 */
export function getVisibleMessages(
  thread: SlackMessage[],
  executedCommands: string[],
  createdBranches: Set<string>,
  commitCount: number,
  hasConflicts: boolean,
): SlackMessage[] {
  return thread.filter((msg) => {
    const trigger = msg.trigger;

    switch (trigger.type) {
      case 'level_start':
        return true;

      case 'after_command':
        return executedCommands.includes(trigger.command);

      case 'after_command_without':
        return (
          executedCommands.includes(trigger.command) &&
          !executedCommands.includes(trigger.without)
        );

      case 'after_branch_created':
        return createdBranches.has(trigger.name);

      case 'after_commit':
        return commitCount > 0;

      case 'conflict_triggered':
        return hasConflicts;

      default:
        return false;
    }
  });
}

export function useLevel(scenario: Scenario): LevelState {
  const engine = useGitEngine(scenario.startingState);

  const isWon = useMemo(
    () =>
      checkWinCondition(
        engine.state,
        scenario.targetState,
        scenario.startingState,
        engine.executedCommands,
      ),
    [engine.state, scenario.targetState, scenario.startingState, engine.executedCommands],
  );

  const visibleMessages = useMemo(
    () =>
      getVisibleMessages(
        scenario.slackThread,
        engine.executedCommands,
        engine.createdBranches,
        engine.commitCount,
        engine.hasConflicts,
      ),
    [
      scenario.slackThread,
      engine.executedCommands,
      engine.createdBranches,
      engine.commitCount,
      engine.hasConflicts,
    ],
  );

  const score = useMemo(
    () => computeScore(engine.commandCount, scenario.par),
    [engine.commandCount, scenario.par],
  );

  return { engine, scenario, isWon, visibleMessages, score };
}
