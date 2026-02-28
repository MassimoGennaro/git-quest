// engine/commands/push.ts — git push command handler

import type { CommandHandler } from '../types';
import { resolveHead } from '../refs';

/**
 * git push                            — push current branch to its remote
 * git push origin <branch>            — push a specific branch to origin
 * git push -u origin <branch>         — push and set upstream
 */
export const push: CommandHandler = (args, _flags, state) => {
  if (state.head.type !== 'branch') {
    return {
      success: false,
      output: 'fatal: You are not currently on a branch.\nTo push a detached HEAD, specify a refspec.',
      newState: state,
    };
  }

  const currentBranch = state.head.name;
  let branchToPush = currentBranch;

  // If args are provided: git push origin <branch>
  if (args.length >= 2) {
    branchToPush = args[1]!;
  } else if (args.length === 1) {
    // git push origin — push current branch
    // The arg is the remote name, push current branch
    branchToPush = currentBranch;
  }

  // Verify the branch exists
  if (!(branchToPush in state.branches)) {
    return {
      success: false,
      output: `error: src refspec '${branchToPush}' does not match any.`,
      newState: state,
    };
  }

  const localHash = state.branches[branchToPush]!;
  const remoteHash = state.remote.branches[branchToPush];

  // Already up to date
  if (remoteHash === localHash) {
    return {
      success: true,
      output: 'Everything up-to-date',
      newState: state,
    };
  }

  // Update the remote branch to match local
  const newState = {
    ...state,
    remote: {
      ...state.remote,
      branches: {
        ...state.remote.branches,
        [branchToPush]: localHash,
      },
    },
  };

  const headHash = resolveHead(state);
  const shortOld = remoteHash ? remoteHash.slice(0, 7) : '0000000';
  const shortNew = headHash ? headHash.slice(0, 7) : localHash.slice(0, 7);

  return {
    success: true,
    output: `To ${state.remote.name}\n   ${shortOld}..${shortNew}  ${branchToPush} -> ${branchToPush}`,
    newState,
  };
};
