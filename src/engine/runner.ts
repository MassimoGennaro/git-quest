// engine/runner.ts — Dispatch parsed commands to the correct handler

import type { CommandHandler, CommandResult, ParsedCommand, RepoState } from './types';
import { add } from './commands/add';
import { branch } from './commands/branch';
import { checkout } from './commands/checkout';
import { cherryPick } from './commands/cherryPick';
import { commit } from './commands/commit';
import { diff } from './commands/diff';
import { log } from './commands/log';
import { merge } from './commands/merge';
import { push } from './commands/push';
import { rebase } from './commands/rebase';
import { reflog } from './commands/reflog';
import { reset } from './commands/reset';
import { stash } from './commands/stash';
import { status } from './commands/status';

/** Registry of supported command handlers */
const handlers: Record<string, CommandHandler> = {
  add,
  branch,
  checkout,
  'cherry-pick': cherryPick,
  commit,
  diff,
  log,
  merge,
  push,
  rebase,
  reflog,
  reset,
  stash,
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
