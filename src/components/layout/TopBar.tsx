// components/layout/TopBar.tsx — Top bar with branch indicator, level info, hints, undo, retry, and levels button

import { useState } from 'react';

import type { RepoState } from '@/engine/types';
import type { Scenario } from '@/levels/schema';
import { TIER_TO_DIFFICULTY, DIFFICULTY_LABELS } from '@/levels/schema';

interface TopBarProps {
  state: RepoState;
  scenario: Scenario;
  commandCount: number;
  onRetry: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onShowSelector: () => void;
}

const DIFFICULTY_BADGE_COLORS: Record<string, string> = {
  easy: 'bg-green-600/60 text-green-200',
  medium: 'bg-blue-600/60 text-blue-200',
  hard: 'bg-orange-600/60 text-orange-200',
  pro: 'bg-red-600/60 text-red-200',
};

export function TopBar({
  state,
  scenario,
  commandCount,
  onRetry,
  onUndo,
  canUndo,
  onShowSelector,
}: TopBarProps) {
  const [showHints, setShowHints] = useState(false);

  const branchDisplay =
    state.head.type === 'branch'
      ? state.head.name
      : `detached @ ${state.head.hash.slice(0, 7)}`;

  const difficulty = TIER_TO_DIFFICULTY[scenario.tier];
  const difficultyLabel = difficulty ? DIFFICULTY_LABELS[difficulty] : `Tier ${scenario.tier}`;
  const badgeColor = difficulty
    ? DIFFICULTY_BADGE_COLORS[difficulty] ?? 'bg-gray-600 text-gray-200'
    : 'bg-gray-600 text-gray-200';

  // Color the move counter: green at/under par, yellow at par+1..par+2, red beyond
  const isOverPar = commandCount > scenario.par;
  const isNearPar = commandCount > scenario.par && commandCount <= scenario.par + 2;
  const moveCountColor = commandCount === 0
    ? 'text-gray-500'
    : isOverPar
      ? isNearPar
        ? 'text-yellow-400'
        : 'text-red-400'
      : 'text-green-400';

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        {/* Left: levels button + branch indicator + move counter */}
        <div className="flex items-center gap-3">
          <button
            onClick={onShowSelector}
            className="text-sm font-mono px-2 py-0.5 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors border border-gray-600 hover:border-gray-500"
            title="Back to level list"
          >
            Levels
          </button>
          <span className="text-blue-400 font-mono text-sm">
            &#x2387; {branchDisplay}
          </span>
          <span className={`font-mono text-xs ${moveCountColor}`}>
            {commandCount}/{scenario.par} moves
          </span>
        </div>

        {/* Center: difficulty badge + level title + par */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeColor}`}
          >
            {difficultyLabel}
          </span>
          <span className="text-gray-100 font-bold tracking-wide">
            {scenario.title}
          </span>
          <span className="text-xs text-gray-500 font-mono">
            par {scenario.par}
          </span>
        </div>

        {/* Right: undo, retry, hints */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`text-sm font-mono px-2 py-0.5 rounded transition-colors ${
              canUndo
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 cursor-not-allowed'
            }`}
            title="Undo last command"
          >
            undo
          </button>
          <button
            onClick={onRetry}
            className="text-sm font-mono px-2 py-0.5 rounded text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            title="Restart level"
          >
            retry
          </button>
          {scenario.hints && scenario.hints.length > 0 && (
            <button
              onClick={() => setShowHints(!showHints)}
              className="text-sm text-gray-400 hover:text-yellow-400 transition-colors font-mono"
            >
              {showHints ? 'hide hints' : 'hints'}
            </button>
          )}
        </div>
      </div>

      {/* Hints dropdown */}
      {showHints && scenario.hints && (
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
          <ol className="list-decimal list-inside space-y-1">
            {scenario.hints.map((hint, i) => (
              <li key={i} className="text-xs text-yellow-300/80 font-mono">
                {hint}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}
