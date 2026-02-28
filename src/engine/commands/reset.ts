// engine/commands/reset.ts — git reset command handler

import type { CommandHandler, RepoState } from '../types';
import { resolveHead } from '../refs';
import { getCommit } from '../store';

/**
 * git reset HEAD <file>         — unstage a file (remove from index)
 * git reset --soft HEAD~N       — move HEAD back N commits, keep index & working tree
 * git reset [--mixed] HEAD~N    — move HEAD back N commits, reset index, keep working tree
 * git reset --hard HEAD~N       — move HEAD back N commits, reset index & working tree
 * git reset --soft <hash>       — move HEAD to hash, keep index & working tree
 * git reset --mixed <hash>      — move HEAD to hash, reset index, keep working tree
 * git reset --hard <hash>       — move HEAD to hash, reset everything
 */
export const reset: CommandHandler = (args, flags, state) => {
  const isSoft = flags['soft'] === true;
  const isHard = flags['hard'] === true;
  // Default mode is mixed (when neither --soft nor --hard)

  // git reset HEAD <file> — unstage specific files
  // Detect file unstaging: first arg is HEAD (or empty) and remaining args are filenames
  if (args.length >= 2 && args[0] === 'HEAD') {
    return unstageFiles(args.slice(1), state);
  }

  // git reset (no args, no flags) — unstage everything
  if (args.length === 0 && !isSoft && !isHard) {
    return unstageAll(state);
  }

  // Determine target: args[0] could be HEAD~N, a hash, or HEAD
  const target = args[0] ?? 'HEAD';
  const targetHash = resolveTarget(target, state);

  if (!targetHash) {
    return {
      success: false,
      output: `fatal: ambiguous argument '${target}': unknown revision.`,
      newState: state,
    };
  }

  const targetCommit = getCommit(state, targetHash);
  if (!targetCommit) {
    return {
      success: false,
      output: `fatal: Could not resolve '${target}' to a commit.`,
      newState: state,
    };
  }

  // Move HEAD to target
  let newState: RepoState;

  if (isSoft) {
    // --soft: only move HEAD, keep index and working tree
    newState = moveHead(state, targetHash);
  } else if (isHard) {
    // --hard: move HEAD, reset index and working tree
    newState = moveHead(state, targetHash);
    newState = { ...newState, index: {}, workingTree: { files: {} } };
  } else {
    // --mixed (default): move HEAD, reset index, keep working tree
    newState = moveHead(state, targetHash);
    newState = { ...newState, index: {} };
  }

  // Add reflog entry
  newState = {
    ...newState,
    reflog: [
      { hash: targetHash, description: `reset: moving to ${target}` },
      ...state.reflog,
    ],
  };

  return {
    success: true,
    output: `HEAD is now at ${targetHash.slice(0, 7)} ${targetCommit.message}`,
    newState,
  };
};

/** Unstage specific files from the index */
function unstageFiles(
  filenames: string[],
  state: RepoState,
): import('../types').CommandResult {
  const newIndex = { ...state.index };
  const unstaged: string[] = [];

  for (const filename of filenames) {
    if (filename in newIndex) {
      delete newIndex[filename];
      unstaged.push(filename);
    }
  }

  if (unstaged.length === 0) {
    return {
      success: true,
      output: 'No changes.',
      newState: state,
    };
  }

  const newState: RepoState = { ...state, index: newIndex };
  const lines = unstaged.map((f) => `Unstaged changes after reset:\n  ${f}`);

  return {
    success: true,
    output: lines.join('\n'),
    newState,
  };
}

/** Unstage all files from the index */
function unstageAll(state: RepoState): import('../types').CommandResult {
  if (Object.keys(state.index).length === 0) {
    return {
      success: true,
      output: 'Nothing to reset.',
      newState: state,
    };
  }

  const filenames = Object.keys(state.index).sort();
  const newState: RepoState = { ...state, index: {} };

  return {
    success: true,
    output: `Unstaged changes after reset:\n${filenames.map((f) => `  ${f}`).join('\n')}`,
    newState,
  };
}

/**
 * Resolve a target string to a commit hash.
 * Supports: HEAD, HEAD~N, HEAD~, branch names, and raw hashes.
 */
function resolveTarget(target: string, state: RepoState): string | null {
  // HEAD~N notation
  const headTildeMatch = target.match(/^HEAD~(\d*)$/);
  if (headTildeMatch) {
    const n = headTildeMatch[1] === '' ? 1 : parseInt(headTildeMatch[1]!, 10);
    return walkBack(state, resolveHead(state), n);
  }

  // Plain HEAD
  if (target === 'HEAD') {
    return resolveHead(state);
  }

  // Branch name
  if (target in state.branches) {
    return state.branches[target]!;
  }

  // Raw hash (full or prefix)
  if (target in state.commits) {
    return target;
  }

  // Try matching a hash prefix
  const matches = Object.keys(state.commits).filter((h) =>
    h.startsWith(target),
  );
  if (matches.length === 1) {
    return matches[0]!;
  }

  return null;
}

/** Walk back N commits from a starting hash */
function walkBack(
  state: RepoState,
  startHash: string | null,
  n: number,
): string | null {
  let current = startHash;
  for (let i = 0; i < n; i++) {
    if (!current) return null;
    const commit = getCommit(state, current);
    if (!commit || commit.parentHashes.length === 0) return null;
    current = commit.parentHashes[0]!;
  }
  return current;
}

/** Move HEAD to a new commit hash */
function moveHead(state: RepoState, targetHash: string): RepoState {
  if (state.head.type === 'branch') {
    return {
      ...state,
      branches: {
        ...state.branches,
        [state.head.name]: targetHash,
      },
    };
  }
  return {
    ...state,
    head: { type: 'detached', hash: targetHash },
  };
}
