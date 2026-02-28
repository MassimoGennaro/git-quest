// engine/parser.ts — Parse raw command strings into structured ParsedCommand objects

import type { ParseResult } from './types';

/** List of git subcommands the engine supports */
const SUPPORTED_COMMANDS = new Set([
  'add',
  'commit',
  'status',
  'log',
  'branch',
  'checkout',
  'merge',
  'push',
  'pull',
  'stash',
  'reset',
  'rebase',
  'cherry-pick',
  'diff',
]);

/**
 * Tokenise a command string, respecting quoted strings.
 * Handles both single and double quotes.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === ' ' || char === '\t') {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse a raw command string into a structured ParsedCommand.
 *
 * Expected format: `git <subcommand> [flags] [args]`
 *
 * Flags:
 *   -m "message"   → flags: { m: "message" }
 *   -b             → flags: { b: true }
 *   --amend        → flags: { amend: true }
 *   --hard         → flags: { hard: true }
 *   --soft         → flags: { soft: true }
 */
export function parseCommand(input: string): ParseResult {
  const raw = input.trim();

  if (raw.length === 0) {
    return { success: false, error: 'Please enter a command.', raw };
  }

  const tokens = tokenize(raw);

  if (tokens.length === 0) {
    return { success: false, error: 'Please enter a command.', raw };
  }

  // Must start with "git"
  if (tokens[0] !== 'git') {
    return {
      success: false,
      error: `Unknown command: "${tokens[0]}". This terminal only accepts git commands.`,
      raw,
    };
  }

  if (tokens.length < 2) {
    return {
      success: false,
      error: 'Usage: git <command> [options]. Try "git status" to get started.',
      raw,
    };
  }

  const subcommand = tokens[1]!;

  if (!SUPPORTED_COMMANDS.has(subcommand)) {
    return {
      success: false,
      error: `Unknown command: "git ${subcommand}". Type a supported git command.`,
      raw,
    };
  }

  // Parse remaining tokens into flags and args
  const flags: Record<string, string | boolean> = {};
  const args: string[] = [];

  // Flags that take a value argument (next token is the value)
  const flagsWithValue = new Set(['m']);

  let i = 2;
  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.startsWith('--')) {
      // Long flag: --amend, --hard, --soft, --oneline, etc.
      const flagName = token.slice(2);
      flags[flagName] = true;
    } else if (token.startsWith('-') && token.length > 1) {
      // Short flag: -m "msg", -b, -d, etc.
      const flagName = token.slice(1);
      if (flagsWithValue.has(flagName) && i + 1 < tokens.length) {
        i++;
        flags[flagName] = tokens[i]!;
      } else {
        flags[flagName] = true;
      }
    } else {
      // Positional argument
      args.push(token);
    }

    i++;
  }

  return {
    success: true,
    parsed: {
      command: subcommand,
      args,
      flags,
      raw,
    },
  };
}
