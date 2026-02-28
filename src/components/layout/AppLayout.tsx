// components/layout/AppLayout.tsx — Main application layout

import { useState, useEffect, useCallback } from 'react';

import type { LevelState } from '@/hooks/useLevel';
import { resolveConflict } from '@/components/panels/ConflictPicker/ConflictPicker';
import { rebaseApply } from '@/engine/commands/rebase';
import type { RebaseAction } from '@/components/panels/RebasePicker/RebasePicker';
import { TopBar } from './TopBar';
import { GraphPanel } from '../panels/GraphPanel/GraphPanel';
import { WorkingTreePanel } from '../panels/WorkingTreePanel/WorkingTreePanel';
import { Terminal } from '../panels/Terminal/Terminal';
import { SlackPanel } from '../panels/SlackPanel/SlackPanel';
import { ConflictPicker } from '../panels/ConflictPicker/ConflictPicker';
import { LevelComplete } from '../panels/LevelComplete/LevelComplete';
import { RebasePicker } from '../panels/RebasePicker/RebasePicker';

interface AppLayoutProps {
  level: LevelState;
  onNextLevel: () => void;
  onRetry: () => void;
  onShowSelector: () => void;
}

export function AppLayout({ level, onNextLevel, onRetry, onShowSelector }: AppLayoutProps) {
  const { engine, scenario, isWon, visibleMessages, score } = level;
  const { state, log, execute, lastRebaseInteractive, clearRebaseInteractive } = engine;

  // Track which conflict file is currently being shown in the picker.
  // null means no picker is open.
  const [activeConflict, setActiveConflict] = useState<string | null>(null);

  // Auto-open conflict picker when new conflicts appear
  const conflictedFiles = Object.entries(state.workingTree.files)
    .filter(([, f]) => f.status === 'conflicted')
    .map(([name]) => name);

  useEffect(() => {
    // If there are conflicts and no picker is open, open the first one
    if (conflictedFiles.length > 0 && activeConflict === null) {
      setActiveConflict(conflictedFiles[0] ?? null);
    }
    // If the active conflict was resolved, check if there are more
    if (activeConflict && !conflictedFiles.includes(activeConflict)) {
      if (conflictedFiles.length > 0) {
        setActiveConflict(conflictedFiles[0] ?? null);
      } else {
        setActiveConflict(null);
      }
    }
  }, [conflictedFiles, activeConflict]);

  const handleResolve = useCallback(
    (filename: string, resolvedContent: string) => {
      // Apply conflict resolution via the pure resolveConflict function,
      // then patch the engine state directly (no command count increment).
      const newState = resolveConflict(state, filename, resolvedContent);
      engine.patchState(newState);

      // Move to next conflict or close
      const remaining = conflictedFiles.filter((f) => f !== filename);
      if (remaining.length > 0) {
        setActiveConflict(remaining[0] ?? null);
      } else {
        setActiveConflict(null);
      }
    },
    [state, engine, conflictedFiles],
  );

  const handleDismissConflict = useCallback(() => {
    setActiveConflict(null);
  }, []);

  // Handle interactive rebase apply
  const handleRebaseApply = useCallback(
    (actions: Array<{ hash: string; action: RebaseAction }>) => {
      if (!lastRebaseInteractive) return;
      const result = rebaseApply(state, lastRebaseInteractive.ontoHash, actions);
      engine.patchState(result.newState);
      clearRebaseInteractive();
    },
    [state, engine, lastRebaseInteractive, clearRebaseInteractive],
  );

  const handleRebaseCancel = useCallback(() => {
    clearRebaseInteractive();
  }, [clearRebaseInteractive]);

  const activeConflictFile =
    activeConflict ? state.workingTree.files[activeConflict] : undefined;

  return (
    <div className="h-screen flex flex-col bg-panel-950 text-gray-100 font-mono">
      {/* Top Bar */}
      <TopBar
        state={state}
        scenario={scenario}
        commandCount={engine.commandCount}
        onRetry={onRetry}
        onUndo={engine.undo}
        canUndo={engine.canUndo}
        onShowSelector={onShowSelector}
      />

      {/* Slack Panel */}
      <SlackPanel messages={visibleMessages} />

      {/* Main content: Working Tree + Graph */}
      <div className="flex flex-1 min-h-0">
        <WorkingTreePanel state={state} />
        <GraphPanel state={state} targetState={scenario.targetState} startingState={scenario.startingState} executedCommands={engine.executedCommands} />
      </div>

      {/* Terminal */}
      <Terminal lines={log} onExecute={execute} />

      {/* Conflict Picker modal */}
      {activeConflict && activeConflictFile && (
        <ConflictPicker
          filename={activeConflict}
          file={activeConflictFile}
          onResolve={handleResolve}
          onDismiss={handleDismissConflict}
        />
      )}

      {/* Level Complete overlay */}
      {isWon && (
        <LevelComplete
          title={scenario.title}
          score={score}
          commandCount={engine.commandCount}
          par={scenario.par}
          onNextLevel={onNextLevel}
          onRetry={onRetry}
          onShowSelector={onShowSelector}
        />
      )}

      {/* Interactive Rebase Picker modal */}
      {lastRebaseInteractive && (
        <RebasePicker
          info={lastRebaseInteractive}
          onApply={handleRebaseApply}
          onCancel={handleRebaseCancel}
        />
      )}
    </div>
  );
}
