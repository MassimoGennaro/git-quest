// engine/commands/checkout.ts — git checkout command handler

import type { CommandHandler } from '../types';
import { resolveHead } from '../refs';

/**
 * git checkout <branch>       — switch to an existing branch
 * git checkout -b <name>      — create and switch to a new branch
 */
export const checkout: CommandHandler = (args, flags, state) => {
  const createBranch = flags['b'] === true;

  if (args.length === 0) {
    return {
      success: false,
      output: 'error: you must specify a branch to checkout.',
      newState: state,
    };
  }

  const branchName = args[0]!;

  // git checkout -b <name>
  if (createBranch) {
    if (branchName in state.branches) {
      return {
        success: false,
        output: `fatal: A branch named '${branchName}' already exists.`,
        newState: state,
      };
    }

    const headHash = resolveHead(state);
    if (!headHash) {
      return {
        success: false,
        output: 'fatal: Not a valid object name: no commits yet.',
        newState: state,
      };
    }

    // Check for uncommitted changes that would be lost
    if (hasUncommittedChanges(state)) {
      return {
        success: false,
        output:
          'error: Your local changes would be overwritten by checkout.\nPlease commit or stash them before switching branches.',
        newState: state,
      };
    }

    const newState = {
      ...state,
      branches: {
        ...state.branches,
        [branchName]: headHash,
      },
      head: { type: 'branch' as const, name: branchName },
    };

    return {
      success: true,
      output: `Switched to a new branch '${branchName}'`,
      newState,
    };
  }

  // git checkout <branch> — switch to existing branch
  if (!(branchName in state.branches)) {
    // Check if it's a commit hash (detached HEAD)
    if (branchName in state.commits) {
      const newState = {
        ...state,
        head: { type: 'detached' as const, hash: branchName },
      };
      return {
        success: true,
        output: `Note: switching to '${branchName}'.\n\nYou are in 'detached HEAD' state.`,
        newState,
      };
    }

    return {
      success: false,
      output: `error: pathspec '${branchName}' did not match any branch or commit.`,
      newState: state,
    };
  }

  // Already on this branch
  if (state.head.type === 'branch' && state.head.name === branchName) {
    return {
      success: true,
      output: `Already on '${branchName}'`,
      newState: state,
    };
  }

  // Check for uncommitted changes that would be lost
  if (hasUncommittedChanges(state)) {
    return {
      success: false,
      output:
        'error: Your local changes would be overwritten by checkout.\nPlease commit or stash them before switching branches.',
      newState: state,
    };
  }

  const newState = {
    ...state,
    head: { type: 'branch' as const, name: branchName },
  };

  return {
    success: true,
    output: `Switched to branch '${branchName}'`,
    newState,
  };
};

/** Check if there are uncommitted changes (staged or working tree) */
function hasUncommittedChanges(state: import('../types').RepoState): boolean {
  const hasStagedChanges = Object.keys(state.index).length > 0;
  const hasWorkingTreeChanges = Object.keys(state.workingTree.files).length > 0;
  return hasStagedChanges || hasWorkingTreeChanges;
}
