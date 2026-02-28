// engine/commands/branch.ts — git branch command handler

import type { CommandHandler } from '../types';
import { resolveHead } from '../refs';

/**
 * git branch              — list all branches
 * git branch <name>       — create a new branch at HEAD
 * git branch -d <name>    — delete a branch
 */
export const branch: CommandHandler = (args, flags, state) => {
  const isDelete = flags['d'] === true || flags['D'] === true;

  // git branch -d <name>
  if (isDelete) {
    if (args.length === 0) {
      return {
        success: false,
        output: 'fatal: branch name required',
        newState: state,
      };
    }

    const branchName = args[0]!;

    if (!(branchName in state.branches)) {
      return {
        success: false,
        output: `error: branch '${branchName}' not found.`,
        newState: state,
      };
    }

    // Cannot delete the current branch
    if (
      state.head.type === 'branch' &&
      state.head.name === branchName
    ) {
      return {
        success: false,
        output: `error: Cannot delete branch '${branchName}' checked out at current HEAD.`,
        newState: state,
      };
    }

    const newBranches = { ...state.branches };
    delete newBranches[branchName];

    return {
      success: true,
      output: `Deleted branch ${branchName}.`,
      newState: { ...state, branches: newBranches },
    };
  }

  // git branch (no args) — list branches
  if (args.length === 0) {
    const branchNames = Object.keys(state.branches).sort();
    if (branchNames.length === 0) {
      return {
        success: true,
        output: 'No branches.',
        newState: state,
      };
    }

    const currentBranch =
      state.head.type === 'branch' ? state.head.name : null;

    const lines = branchNames.map((name) => {
      if (name === currentBranch) {
        return `* ${name}`;
      }
      return `  ${name}`;
    });

    return {
      success: true,
      output: lines.join('\n'),
      newState: state,
    };
  }

  // git branch <name> — create a new branch at HEAD
  const branchName = args[0]!;

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

  const newState = {
    ...state,
    branches: {
      ...state.branches,
      [branchName]: headHash,
    },
  };

  return {
    success: true,
    output: '',
    newState,
  };
};
