// engine/mergeUtils.ts — Shared merge/graph utilities used by merge, cherry-pick, rebase

import type { FileTree, RepoState } from './types';
import { getCommit } from './store';

/**
 * Check if `ancestorHash` is an ancestor of `descendantHash`.
 * Uses BFS to walk the commit graph backwards from the descendant.
 */
export function isAncestor(
  state: RepoState,
  ancestorHash: string,
  descendantHash: string,
): boolean {
  if (ancestorHash === descendantHash) return true;

  const visited = new Set<string>();
  const queue = [descendantHash];

  while (queue.length > 0) {
    const hash = queue.shift()!;
    if (hash === ancestorHash) return true;
    if (visited.has(hash)) continue;
    visited.add(hash);

    const commit = getCommit(state, hash);
    if (commit) {
      queue.push(...commit.parentHashes);
    }
  }

  return false;
}

/**
 * Find the common ancestor of two commits using BFS from both sides.
 * Returns the first commit hash reachable from both.
 */
export function findCommonAncestor(
  state: RepoState,
  hashA: string,
  hashB: string,
): string | null {
  const ancestorsA = getAllAncestors(state, hashA);
  const ancestorsB = getAllAncestors(state, hashB);

  for (const hash of ancestorsB) {
    if (ancestorsA.has(hash)) {
      return hash;
    }
  }

  return null;
}

/** Get all ancestor hashes of a commit (including itself), in BFS order */
export function getAllAncestors(
  state: RepoState,
  hash: string,
): Set<string> {
  const ancestors = new Set<string>();
  const queue = [hash];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (ancestors.has(current)) continue;
    ancestors.add(current);

    const commit = getCommit(state, current);
    if (commit) {
      queue.push(...commit.parentHashes);
    }
  }

  return ancestors;
}

/** Detect file-level conflicts between ancestor, ours, and theirs trees */
export function detectConflicts(
  ancestor: FileTree,
  ours: FileTree,
  theirs: FileTree,
): Record<string, { ours: string; theirs: string; ancestor: string }> {
  const conflicts: Record<
    string,
    { ours: string; theirs: string; ancestor: string }
  > = {};

  const allFiles = new Set([
    ...Object.keys(ancestor),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ]);

  for (const filename of allFiles) {
    const ancestorContent = ancestor[filename]?.content ?? '';
    const oursContent = ours[filename]?.content ?? '';
    const theirsContent = theirs[filename]?.content ?? '';

    const oursChanged = oursContent !== ancestorContent;
    const theirsChanged = theirsContent !== ancestorContent;

    if (oursChanged && theirsChanged && oursContent !== theirsContent) {
      conflicts[filename] = {
        ours: oursContent,
        theirs: theirsContent,
        ancestor: ancestorContent,
      };
    }
  }

  return conflicts;
}

/** Merge two trees cleanly (no conflicts) relative to a common ancestor */
export function mergeTreesClean(
  ancestor: FileTree,
  ours: FileTree,
  theirs: FileTree,
): FileTree {
  const result: FileTree = { ...ours };

  // Apply changes from theirs that differ from ancestor
  for (const [filename, file] of Object.entries(theirs)) {
    const ancestorContent = ancestor[filename]?.content ?? '';
    if (file.content !== ancestorContent) {
      result[filename] = { content: file.content };
    }
  }

  // Handle deletions in theirs
  for (const filename of Object.keys(ancestor)) {
    if (!(filename in theirs) && filename in ours) {
      const oursContent = ours[filename]?.content ?? '';
      const ancestorContent = ancestor[filename]?.content ?? '';
      if (oursContent === ancestorContent) {
        delete result[filename];
      }
    }
  }

  // Handle additions in theirs
  for (const [filename, file] of Object.entries(theirs)) {
    if (!(filename in ancestor) && !(filename in ours)) {
      result[filename] = { content: file.content };
    }
  }

  return result;
}

/**
 * Get the linear ancestry chain from `from` (exclusive) to `to` (inclusive),
 * walking first parents only. Returns commits in chronological order (oldest first).
 */
export function getCommitChain(
  state: RepoState,
  fromHash: string,
  toHash: string,
): string[] {
  const chain: string[] = [];
  let current = toHash;

  while (current !== fromHash) {
    chain.push(current);
    const commit = getCommit(state, current);
    if (!commit || commit.parentHashes.length === 0) break;
    current = commit.parentHashes[0]!;
  }

  chain.reverse();
  return chain;
}
