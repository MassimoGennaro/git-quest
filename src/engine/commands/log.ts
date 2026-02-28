// engine/commands/log.ts — git log command handler

import type { CommandHandler, Commit, RepoState } from '../types';
import { resolveHead } from '../refs';
import { getCommit } from '../store';

export const log: CommandHandler = (_args, flags, state) => {
  const headHash = resolveHead(state);

  if (!headHash) {
    return {
      success: false,
      output: 'fatal: your current branch does not have any commits yet',
      newState: state,
    };
  }

  const isOneline = flags['oneline'] === true;

  // Walk the commit graph from HEAD backwards
  const commits = walkCommits(state, headHash);

  if (commits.length === 0) {
    return {
      success: false,
      output: 'fatal: no commits found',
      newState: state,
    };
  }

  const lines: string[] = [];

  for (const c of commits) {
    const decorations = getDecorations(state, c.hash);
    const decoStr = decorations.length > 0 ? ` (${decorations.join(', ')})` : '';

    if (isOneline) {
      lines.push(`${c.hash.slice(0, 7)}${decoStr} ${c.message}`);
    } else {
      lines.push(`commit ${c.hash}${decoStr}`);
      lines.push(`Date:   ${new Date(c.timestamp).toISOString()}`);
      lines.push('');
      lines.push(`    ${c.message}`);
      lines.push('');
    }
  }

  return {
    success: true,
    output: lines.join('\n'),
    newState: state,
  };
};

/** Walk the commit graph from a starting hash, following first parents */
function walkCommits(state: RepoState, startHash: string): Commit[] {
  const visited = new Set<string>();
  const result: Commit[] = [];
  const queue = [startHash];

  while (queue.length > 0) {
    const hash = queue.shift()!;
    if (visited.has(hash)) continue;
    visited.add(hash);

    const c = getCommit(state, hash);
    if (!c) continue;

    result.push(c);

    // Follow all parents (first parent first for linear history)
    for (const parentHash of c.parentHashes) {
      if (!visited.has(parentHash)) {
        queue.push(parentHash);
      }
    }
  }

  // Sort by timestamp descending (newest first)
  result.sort((a, b) => b.timestamp - a.timestamp);
  return result;
}

/** Get decoration strings for a commit (HEAD, branch names, remote branches) */
function getDecorations(state: RepoState, hash: string): string[] {
  const decos: string[] = [];

  // Check if HEAD points here
  const headHash = resolveHead(state);
  const isHead = headHash === hash;

  if (isHead && state.head.type === 'branch') {
    decos.push(`HEAD -> ${state.head.name}`);
  } else if (isHead && state.head.type === 'detached') {
    decos.push('HEAD');
  }

  // Check branch refs (skip the one already shown with HEAD)
  for (const [branchName, branchHash] of Object.entries(state.branches)) {
    if (branchHash === hash) {
      if (isHead && state.head.type === 'branch' && state.head.name === branchName) {
        continue; // Already shown as "HEAD -> branchName"
      }
      decos.push(branchName);
    }
  }

  // Check remote refs
  for (const [remoteBranch, remoteHash] of Object.entries(state.remote.branches)) {
    if (remoteHash === hash) {
      decos.push(`${state.remote.name}/${remoteBranch}`);
    }
  }

  return decos;
}
