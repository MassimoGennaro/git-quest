// engine/runner.ts — Dispatch parsed commands to the correct handler

import type { CommandHandler, CommandResult, ParsedCommand, RepoState } from './types';
import { add } from './commands/add';
import { branch } from './commands/branch';
import { checkout } from './commands/checkout';
import { commit } from './commands/commit';
import { log } from './commands/log';
import { merge } from './commands/merge';
import { push } from './commands/push';
import { status } from './commands/status';

/** Registry of supported command handlers */
const handlers: Record<string, CommandHandler> = {
  add,
  branch,
  checkout,
  commit,
  log,
  merge,
  push,
  status,
};

/**
 * Run a parsed command against the current repo state.
 * Returns a CommandResult with the new state and terminal output.
 */
export function runCommand(
  parsed: ParsedCommand,
  state: RepoState,
): CommandResult {
  const handler = handlers[parsed.command];

  if (!handler) {
    return {
      success: false,
      output: `git: '${parsed.command}' is not yet implemented. Try another command.`,
      newState: state,
    };
  }

  return handler(parsed.args, parsed.flags, state);
}
