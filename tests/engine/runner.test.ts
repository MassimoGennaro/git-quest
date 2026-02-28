// tests/engine/runner.test.ts — Unit tests for the command runner

import { describe, it, expect } from 'vitest';
import { runCommand } from '../../src/engine/runner';
import { parseCommand } from '../../src/engine/parser';
import { createStateWithCommit } from './helpers';
import type { RepoState } from '../../src/engine/types';

/** Helper: parse and run a command string against a state */
function execute(input: string, state: RepoState) {
  const parseResult = parseCommand(input);
  if (!parseResult.success) {
    return { success: false, output: parseResult.error, newState: state };
  }
  return runCommand(parseResult.parsed, state);
}

describe('runCommand', () => {
  it('should dispatch git status correctly', () => {
    const state = createStateWithCommit('init');
    const result = execute('git status', state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('On branch main');
  });

  it('should dispatch git add correctly', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      workingTree: {
        files: {
          'file.txt': { status: 'untracked', content: 'hello' },
        },
      },
    };
    const result = execute('git add file.txt', state);
    expect(result.success).toBe(true);
    expect(result.newState.index['file.txt']).toBe('hello');
  });

  it('should dispatch git commit correctly', () => {
    const state: RepoState = {
      ...createStateWithCommit('init'),
      index: { 'file.txt': 'hello' },
    };
    const result = execute('git commit -m "add file"', state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('add file');
  });

  it('should dispatch git log correctly', () => {
    const state = createStateWithCommit('initial commit');
    const result = execute('git log --oneline', state);
    expect(result.success).toBe(true);
    expect(result.output).toContain('initial commit');
  });

  it('should return error for unimplemented commands', () => {
    const state = createStateWithCommit('init');
    const parseResult = parseCommand('git pull');
    if (!parseResult.success) throw new Error('parse failed');
    const result = runCommand(parseResult.parsed, state);
    expect(result.success).toBe(false);
    expect(result.output).toContain('not yet implemented');
  });

  it('should handle a full add + commit workflow', () => {
    let state: RepoState = {
      ...createStateWithCommit('init'),
      workingTree: {
        files: {
          'README.md': { status: 'untracked', content: '# MyApp\nA cool app.' },
        },
      },
    };

    // Step 1: git add README.md
    const addResult = execute('git add README.md', state);
    expect(addResult.success).toBe(true);
    state = addResult.newState;
    expect(state.index['README.md']).toBe('# MyApp\nA cool app.');

    // Step 2: git commit -m "add README"
    const commitResult = execute('git commit -m "add README"', state);
    expect(commitResult.success).toBe(true);
    state = commitResult.newState;

    // Verify: index is clear, new commit exists
    expect(Object.keys(state.index)).toHaveLength(0);
    const headHash = state.branches['main']!;
    const headCommit = state.commits[headHash]!;
    expect(headCommit.message).toBe('add README');
    expect(headCommit.tree['README.md']).toEqual({ content: '# MyApp\nA cool app.' });
    expect(headCommit.parentHashes).toContain('a1b2c3f');

    // Step 3: git status should show clean
    const statusResult = execute('git status', state);
    expect(statusResult.output).toContain('nothing to commit, working tree clean');

    // Step 4: git log should show both commits
    const logResult = execute('git log --oneline', state);
    expect(logResult.output).toContain('add README');
    expect(logResult.output).toContain('init');
  });
});
