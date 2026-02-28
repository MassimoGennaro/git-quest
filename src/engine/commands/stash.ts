// engine/commands/stash.ts — git stash command handler

import type { CommandHandler, RepoState, StashEntry } from '../types';

/**
 * git stash           — save working tree and index changes to the stash
 * git stash pop       — apply the most recent stash and remove it
 * git stash list      — list all stash entries
 * git stash drop      — remove the most recent stash entry
 * git stash apply     — apply the most recent stash (keep it in the list)
 */
export const stash: CommandHandler = (args, _flags, state) => {
  const subcommand = args[0];

  // No subcommand or "push" → stash current changes
  if (!subcommand || subcommand === 'push') {
    return stashPush(state);
  }

  switch (subcommand) {
    case 'pop':
      return stashPop(state);
    case 'list':
      return stashList(state);
    case 'drop':
      return stashDrop(state);
    case 'apply':
      return stashApply(state);
    default:
      return {
        success: false,
        output: `error: unknown subcommand: stash ${subcommand}`,
        newState: state,
      };
  }
};

/** Save working tree and index to the stash stack */
function stashPush(state: RepoState): import('../types').CommandResult {
  const hasStaged = Object.keys(state.index).length > 0;
  const hasWorking = Object.keys(state.workingTree.files).length > 0;

  if (!hasStaged && !hasWorking) {
    return {
      success: false,
      output: 'No local changes to save',
      newState: state,
    };
  }

  const entry: StashEntry = {
    index: { ...state.index },
    workingTree: {
      files: { ...state.workingTree.files },
    },
    message: `WIP on ${state.head.type === 'branch' ? state.head.name : 'HEAD'}`,
  };

  const newState: RepoState = {
    ...state,
    stash: [entry, ...state.stash],
    index: {},
    workingTree: { files: {} },
  };

  return {
    success: true,
    output: `Saved working directory and index state "${entry.message}"`,
    newState,
  };
}

/** Apply and remove the most recent stash */
function stashPop(state: RepoState): import('../types').CommandResult {
  if (state.stash.length === 0) {
    return {
      success: false,
      output: 'error: No stash entries found.',
      newState: state,
    };
  }

  const [entry, ...rest] = state.stash;

  const newState: RepoState = {
    ...state,
    index: { ...state.index, ...entry!.index },
    workingTree: {
      files: { ...state.workingTree.files, ...entry!.workingTree.files },
    },
    stash: rest,
  };

  return {
    success: true,
    output: `On ${state.head.type === 'branch' ? state.head.name : 'HEAD'}: ${entry!.message}\nDropped refs/stash@{0}`,
    newState,
  };
}

/** Apply the most recent stash (keep it in the list) */
function stashApply(state: RepoState): import('../types').CommandResult {
  if (state.stash.length === 0) {
    return {
      success: false,
      output: 'error: No stash entries found.',
      newState: state,
    };
  }

  const entry = state.stash[0]!;

  const newState: RepoState = {
    ...state,
    index: { ...state.index, ...entry.index },
    workingTree: {
      files: { ...state.workingTree.files, ...entry.workingTree.files },
    },
  };

  return {
    success: true,
    output: `On ${state.head.type === 'branch' ? state.head.name : 'HEAD'}: ${entry.message}`,
    newState,
  };
}

/** List all stash entries */
function stashList(state: RepoState): import('../types').CommandResult {
  if (state.stash.length === 0) {
    return {
      success: true,
      output: '',
      newState: state,
    };
  }

  const lines = state.stash.map(
    (entry, i) => `stash@{${i}}: ${entry.message}`,
  );

  return {
    success: true,
    output: lines.join('\n'),
    newState: state,
  };
}

/** Drop the most recent stash entry */
function stashDrop(state: RepoState): import('../types').CommandResult {
  if (state.stash.length === 0) {
    return {
      success: false,
      output: 'error: No stash entries found.',
      newState: state,
    };
  }

  const newState: RepoState = {
    ...state,
    stash: state.stash.slice(1),
  };

  return {
    success: true,
    output: 'Dropped refs/stash@{0}',
    newState,
  };
}
