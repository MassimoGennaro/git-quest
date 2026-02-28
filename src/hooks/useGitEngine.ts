// hooks/useGitEngine.ts — Bridge between the pure engine and React state

import { useState, useCallback, useRef } from 'react';

import type { RepoState, ConflictSet, RebaseInteractiveInfo } from '@/engine/types';
import { parseCommand } from '@/engine/parser';
import { runCommand } from '@/engine/runner';

export interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

/** Metadata about what happened during command execution, used by useLevel */
export interface ExecutionEvent {
  /** The git subcommand that was run (e.g. 'commit', 'merge') */
  command: string;
  /** Whether the command succeeded */
  success: boolean;
  /** Set of conflicts triggered, if any */
  conflictsTriggered?: ConflictSet;
}

/** A snapshot of all engine state, used for undo */
interface EngineSnapshot {
  state: RepoState;
  log: TerminalLine[];
  commandCount: number;
  executedCommands: string[];
  createdBranches: Set<string>;
  commitCount: number;
}

export interface GitEngine {
  state: RepoState;
  log: TerminalLine[];
  execute: (input: string) => void;
  commandCount: number;
  /** History of all commands executed (subcommand names) */
  executedCommands: string[];
  /** Cumulative set of branch names that have been created during this session */
  createdBranches: Set<string>;
  /** Total number of commits made during this session */
  commitCount: number;
  /** Whether conflicts currently exist in the working tree */
  hasConflicts: boolean;
  /** Reset engine to a new initial state (for level switching) */
  reset: (newState: RepoState) => void;
  /** Directly update the repo state (used for conflict resolution UI) */
  patchState: (newState: RepoState) => void;
  /** Undo the last command, restoring previous state */
  undo: () => void;
  /** Whether there is a command to undo */
  canUndo: boolean;
  /** Set when an interactive rebase command is executed; cleared after apply/cancel */
  lastRebaseInteractive: RebaseInteractiveInfo | null;
  /** Clear the interactive rebase signal (called after apply or cancel) */
  clearRebaseInteractive: () => void;
}

export function useGitEngine(initialState: RepoState): GitEngine {
  const [state, setState] = useState<RepoState>(initialState);
  const [log, setLog] = useState<TerminalLine[]>([]);
  const [commandCount, setCommandCount] = useState(0);
  const [executedCommands, setExecutedCommands] = useState<string[]>([]);
  const [commitCount, setCommitCount] = useState(0);

  // Use ref for created branches to avoid needing it in the dep array
  const createdBranchesRef = useRef<Set<string>>(new Set());
  const [createdBranches, setCreatedBranches] = useState<Set<string>>(
    new Set(),
  );

  // Undo history: stack of snapshots taken before each successful command
  const historyRef = useRef<EngineSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Interactive rebase state: set when a command returns rebaseInteractive
  const [lastRebaseInteractive, setLastRebaseInteractive] =
    useState<RebaseInteractiveInfo | null>(null);

  const clearRebaseInteractive = useCallback(() => {
    setLastRebaseInteractive(null);
  }, []);

  const execute = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (trimmed.length === 0) return;

      // Echo the command
      setLog((prev) => [...prev, { type: 'input', text: `$ ${trimmed}` }]);

      const parsed = parseCommand(trimmed);

      if (!parsed.success) {
        setLog((prev) => [...prev, { type: 'error', text: parsed.error }]);
        return;
      }

      // Capture branch names before execution to detect new branches
      const branchesBefore = new Set(Object.keys(state.branches));

      const result = runCommand(parsed.parsed, state);

      if (result.output.length > 0) {
        setLog((prev) => [
          ...prev,
          { type: result.success ? 'output' : 'error', text: result.output },
        ]);
      }

      // Save snapshot BEFORE applying state change (for undo)
      // We save on every command that counts (successful parse + execution),
      // regardless of whether the command itself succeeded, because the
      // command count increments either way.
      historyRef.current.push({
        state,
        log,
        commandCount,
        executedCommands,
        createdBranches: new Set(createdBranchesRef.current),
        commitCount,
      });
      setCanUndo(true);

      setState(result.newState);
      setCommandCount((c) => c + 1);
      setExecutedCommands((prev) => [...prev, parsed.parsed.command]);

      // Signal the UI if the command triggered an interactive rebase
      if (result.rebaseInteractive) {
        setLastRebaseInteractive(result.rebaseInteractive);
      }

      // Track new branches created
      const branchesAfter = Object.keys(result.newState.branches);
      for (const branch of branchesAfter) {
        if (!branchesBefore.has(branch)) {
          createdBranchesRef.current.add(branch);
          setCreatedBranches(new Set(createdBranchesRef.current));
        }
      }

      // Track commits
      if (parsed.parsed.command === 'commit' && result.success) {
        setCommitCount((c) => c + 1);
      }
    },
    [state, log, commandCount, executedCommands, commitCount, createdBranches],
  );

  const reset = useCallback((newState: RepoState) => {
    setState(newState);
    setLog([]);
    setCommandCount(0);
    setExecutedCommands([]);
    setCommitCount(0);
    createdBranchesRef.current = new Set();
    setCreatedBranches(new Set());
    historyRef.current = [];
    setCanUndo(false);
    setLastRebaseInteractive(null);
  }, []);

  // Patch state without resetting any tracking (used for conflict resolution)
  const patchState = useCallback((newState: RepoState) => {
    setState(newState);
  }, []);

  // Undo: pop the most recent snapshot and restore all state
  const undo = useCallback(() => {
    const snapshot = historyRef.current.pop();
    if (!snapshot) return;

    setState(snapshot.state);
    // Append an "[undo]" marker to the terminal log so the player sees it happened
    setLog([...snapshot.log, { type: 'output', text: '(undo)' }]);
    setCommandCount(snapshot.commandCount);
    setExecutedCommands(snapshot.executedCommands);
    setCommitCount(snapshot.commitCount);
    createdBranchesRef.current = new Set(snapshot.createdBranches);
    setCreatedBranches(new Set(snapshot.createdBranches));
    setCanUndo(historyRef.current.length > 0);
  }, []);

  // Check for conflicts in working tree
  const hasConflicts = Object.values(state.workingTree.files).some(
    (f) => f.status === 'conflicted',
  );

  return {
    state,
    log,
    execute,
    commandCount,
    executedCommands,
    createdBranches,
    commitCount,
    hasConflicts,
    reset,
    patchState,
    undo,
    canUndo,
    lastRebaseInteractive,
    clearRebaseInteractive,
  };
}
