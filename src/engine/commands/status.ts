// engine/commands/status.ts — git status command handler

import type { CommandHandler } from '../types';
import { resolveHead } from '../refs';
import { getFilesByStatus } from '../workingTree';

export const status: CommandHandler = (_args, _flags, state) => {
  const headRef = state.head;
  const headHash = resolveHead(state);

  const staged = Object.keys(state.index);
  const modified = Object.keys(getFilesByStatus(state, 'modified'));
  const untracked = Object.keys(getFilesByStatus(state, 'untracked'));
  const deleted = Object.keys(getFilesByStatus(state, 'deleted'));
  const conflicted = Object.keys(getFilesByStatus(state, 'conflicted'));

  const lines: string[] = [];

  // HEAD info
  if (headRef.type === 'branch') {
    lines.push(`On branch ${headRef.name}`);
  } else {
    lines.push(`HEAD detached at ${headHash?.slice(0, 7) ?? 'unknown'}`);
  }

  // Staged changes
  if (staged.length > 0) {
    lines.push('');
    lines.push('Changes to be committed:');
    lines.push('  (use "git reset HEAD <file>..." to unstage)');
    lines.push('');
    for (const file of staged.sort()) {
      lines.push(`\tnew file:   ${file}`);
    }
  }

  // Conflicted files
  if (conflicted.length > 0) {
    lines.push('');
    lines.push('Unmerged paths:');
    lines.push('  (fix conflicts and run "git add <file>...")');
    lines.push('');
    for (const file of conflicted.sort()) {
      lines.push(`\tboth modified:   ${file}`);
    }
  }

  // Modified files
  if (modified.length > 0 || deleted.length > 0) {
    lines.push('');
    lines.push('Changes not staged for commit:');
    lines.push('  (use "git add <file>..." to update what will be committed)');
    lines.push('');
    for (const file of modified.sort()) {
      lines.push(`\tmodified:   ${file}`);
    }
    for (const file of deleted.sort()) {
      lines.push(`\tdeleted:    ${file}`);
    }
  }

  // Untracked files
  if (untracked.length > 0) {
    lines.push('');
    lines.push('Untracked files:');
    lines.push('  (use "git add <file>..." to include in what will be committed)');
    lines.push('');
    for (const file of untracked.sort()) {
      lines.push(`\t${file}`);
    }
  }

  // Nothing to report
  if (
    staged.length === 0 &&
    modified.length === 0 &&
    untracked.length === 0 &&
    deleted.length === 0 &&
    conflicted.length === 0
  ) {
    lines.push('');
    lines.push('nothing to commit, working tree clean');
  }

  return {
    success: true,
    output: lines.join('\n'),
    newState: state,
  };
};
