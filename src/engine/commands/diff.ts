// engine/commands/diff.ts — git diff command handler

import type { CommandHandler, FileTree } from '../types';
import { resolveHead } from '../refs';
import { getCommit } from '../store';

/**
 * git diff             — show unstaged changes (working tree vs index/HEAD)
 * git diff --staged    — show staged changes (index vs HEAD)
 * git diff --cached    — alias for --staged
 *
 * This is a simplified diff that shows file-level changes only
 * (added/modified/deleted), not line-by-line diffs.
 */
export const diff: CommandHandler = (_args, flags, state) => {
  const staged = flags['staged'] === true || flags['cached'] === true;

  const headHash = resolveHead(state);
  let headTree: FileTree = {};
  if (headHash) {
    const headCommit = getCommit(state, headHash);
    if (headCommit) {
      headTree = headCommit.tree;
    }
  }

  if (staged) {
    // Show staged changes: index vs HEAD
    return diffStagedChanges(state.index, headTree, state);
  }

  // Show unstaged changes: working tree vs index/HEAD
  return diffUnstagedChanges(state.workingTree.files, state.index, headTree, state);
};

/**
 * Diff staged changes (index vs HEAD).
 * For each file in the index, compare against the HEAD tree.
 */
function diffStagedChanges(
  index: Record<string, string>,
  headTree: FileTree,
  state: import('../types').RepoState,
): import('../types').CommandResult {
  const lines: string[] = [];
  const sortedFiles = Object.keys(index).sort();

  if (sortedFiles.length === 0) {
    return {
      success: true,
      output: '',
      newState: state,
    };
  }

  for (const filename of sortedFiles) {
    const stagedContent = index[filename]!;
    const headContent = headTree[filename]?.content;

    if (stagedContent === '__DELETED__') {
      lines.push(`diff --git a/${filename} b/${filename}`);
      lines.push(`deleted file`);
      lines.push(`--- a/${filename}`);
      lines.push(`+++ /dev/null`);
      if (headContent !== undefined) {
        lines.push(`-${headContent}`);
      }
    } else if (headContent === undefined) {
      // New file
      lines.push(`diff --git a/${filename} b/${filename}`);
      lines.push(`new file`);
      lines.push(`--- /dev/null`);
      lines.push(`+++ b/${filename}`);
      lines.push(`+${stagedContent}`);
    } else if (stagedContent !== headContent) {
      // Modified
      lines.push(`diff --git a/${filename} b/${filename}`);
      lines.push(`--- a/${filename}`);
      lines.push(`+++ b/${filename}`);
      lines.push(`-${headContent}`);
      lines.push(`+${stagedContent}`);
    }
  }

  if (lines.length === 0) {
    return { success: true, output: '', newState: state };
  }

  return {
    success: true,
    output: lines.join('\n'),
    newState: state,
  };
}

/**
 * Diff unstaged changes (working tree vs index/HEAD).
 * For modified/deleted files in the working tree, compare against the
 * staged version (if any) or the HEAD tree.
 */
function diffUnstagedChanges(
  workingFiles: Record<string, import('../types').WorkingFile>,
  index: Record<string, string>,
  headTree: FileTree,
  state: import('../types').RepoState,
): import('../types').CommandResult {
  const lines: string[] = [];
  const sortedFiles = Object.keys(workingFiles).sort();

  for (const filename of sortedFiles) {
    const wf = workingFiles[filename]!;

    // Untracked files are not shown in diff (they appear in status)
    if (wf.status === 'untracked') continue;

    // For conflicted files, show conflict markers
    if (wf.status === 'conflicted') {
      lines.push(`diff --git a/${filename} b/${filename}`);
      lines.push(`--- a/${filename}`);
      lines.push(`+++ b/${filename}`);
      lines.push(`+<<<<<<< ours`);
      if (wf.conflictOurs) lines.push(`+${wf.conflictOurs}`);
      lines.push(`+=======`);
      if (wf.conflictTheirs) lines.push(`+${wf.conflictTheirs}`);
      lines.push(`+>>>>>>> theirs`);
      continue;
    }

    // Determine the "base" content for comparison: staged version or HEAD
    const baseContent =
      filename in index && index[filename] !== '__DELETED__'
        ? index[filename]!
        : (headTree[filename]?.content ?? '');

    if (wf.status === 'deleted') {
      lines.push(`diff --git a/${filename} b/${filename}`);
      lines.push(`deleted file`);
      lines.push(`--- a/${filename}`);
      lines.push(`+++ /dev/null`);
      if (baseContent) {
        lines.push(`-${baseContent}`);
      }
    } else if (wf.status === 'modified') {
      if (wf.content !== baseContent) {
        lines.push(`diff --git a/${filename} b/${filename}`);
        lines.push(`--- a/${filename}`);
        lines.push(`+++ b/${filename}`);
        lines.push(`-${baseContent}`);
        lines.push(`+${wf.content}`);
      }
    }
  }

  if (lines.length === 0) {
    return { success: true, output: '', newState: state };
  }

  return {
    success: true,
    output: lines.join('\n'),
    newState: state,
  };
}
