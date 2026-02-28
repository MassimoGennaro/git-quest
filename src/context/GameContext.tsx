// context/GameContext.tsx — Global game state: level navigation, view routing, score persistence

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

import type { Scenario } from '@/levels/schema';
import { ALL_LEVELS, getNextLevel } from '@/levels/index';

// ---------------------------------------------------------------------------
// Types (exported for use by LevelSelector, etc.)
// ---------------------------------------------------------------------------

/** Per-level progress: stars earned + best move count */
export interface LevelProgress {
  stars: number;     // 1-3
  bestMoves: number; // command count that earned those stars
}

/** Progress for all levels, keyed by level id */
export type SavedProgress = Record<string, LevelProgress>;

/** Which view is currently shown */
export type GameView = 'selector' | 'game';

// ---------------------------------------------------------------------------
// localStorage helpers — with migration from old stars-only format
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'gitquest-scores';

/**
 * Old format:  { [levelId]: number }          (just stars)
 * New format:  { [levelId]: { stars, bestMoves } }
 */
function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const result: SavedProgress = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number') {
        // Old format: migrate number → LevelProgress
        result[key] = { stars: value, bestMoves: 0 };
      } else if (
        typeof value === 'object' &&
        value !== null &&
        'stars' in value &&
        'bestMoves' in value
      ) {
        result[key] = value as LevelProgress;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveProgress(progress: SavedProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// State + reducer
// ---------------------------------------------------------------------------

interface GameState {
  currentScenario: Scenario;
  progress: SavedProgress;
  view: GameView;
}

type GameAction =
  | { type: 'SWITCH_LEVEL'; scenario: Scenario }
  | { type: 'RECORD_SCORE'; levelId: string; stars: number; moves: number }
  | { type: 'SET_VIEW'; view: GameView };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SWITCH_LEVEL':
      return { ...state, currentScenario: action.scenario, view: 'game' };

    case 'RECORD_SCORE': {
      const prev = state.progress[action.levelId];
      // Only update if: (a) first completion, or (b) better stars, or
      // (c) same stars but fewer moves
      const shouldUpdate =
        !prev ||
        action.stars > prev.stars ||
        (action.stars === prev.stars && action.moves < prev.bestMoves);

      if (!shouldUpdate) return state;

      const updated: SavedProgress = {
        ...state.progress,
        [action.levelId]: { stars: action.stars, bestMoves: action.moves },
      };
      saveProgress(updated);
      return { ...state, progress: updated };
    }

    case 'SET_VIEW':
      return { ...state, view: action.view };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface GameContextValue {
  /** The scenario currently being played */
  currentScenario: Scenario;
  /** Saved progress keyed by level id */
  progress: SavedProgress;
  /** All available levels */
  allLevels: Scenario[];
  /** Current view: selector or game */
  view: GameView;
  /** Switch to a specific level (also sets view to 'game') */
  switchLevel: (scenario: Scenario) => void;
  /** Move to the next level (returns false if there is no next level) */
  goToNextLevel: () => boolean;
  /** Retry the current level (triggers a reset via key change) */
  retry: () => void;
  /** Record a score for a level (persists best to localStorage) */
  recordScore: (levelId: string, stars: number, moves: number) => void;
  /** Navigate to the level selector */
  showSelector: () => void;
  /** Incrementing key to force remount on retry / level switch */
  sessionKey: number;

  // Backwards-compatible: expose scores as the old format for any code that uses it
  scores: Record<string, number>;
}

const GameContext = createContext<GameContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GameProvider({ children }: { children: ReactNode }) {
  const firstLevel = ALL_LEVELS[0];
  if (!firstLevel) {
    throw new Error('No levels registered in ALL_LEVELS');
  }

  const [state, dispatch] = useReducer(gameReducer, {
    currentScenario: firstLevel,
    progress: loadProgress(),
    view: 'selector' as GameView,
  });

  // Session key increments on every level switch / retry to force a full
  // remount of the level components (resetting useGitEngine, useTerminal, etc.)
  const [sessionKey, setSessionKey] = useState(0);
  const bumpSessionKey = useCallback(() => {
    setSessionKey((k) => k + 1);
  }, []);

  const switchLevel = useCallback(
    (scenario: Scenario) => {
      dispatch({ type: 'SWITCH_LEVEL', scenario });
      bumpSessionKey();
    },
    [bumpSessionKey],
  );

  const goToNextLevel = useCallback((): boolean => {
    const next = getNextLevel(state.currentScenario.id);
    if (!next) return false;
    switchLevel(next);
    return true;
  }, [state.currentScenario.id, switchLevel]);

  const retry = useCallback(() => {
    bumpSessionKey();
  }, [bumpSessionKey]);

  const recordScore = useCallback(
    (levelId: string, stars: number, moves: number) => {
      dispatch({ type: 'RECORD_SCORE', levelId, stars, moves });
    },
    [],
  );

  const showSelector = useCallback(() => {
    dispatch({ type: 'SET_VIEW', view: 'selector' });
  }, []);

  // Sync progress to localStorage whenever it changes
  useEffect(() => {
    saveProgress(state.progress);
  }, [state.progress]);

  // Derive old-format scores for backward compatibility
  const scores: Record<string, number> = {};
  for (const [id, p] of Object.entries(state.progress)) {
    scores[id] = p.stars;
  }

  return (
    <GameContext.Provider
      value={{
        currentScenario: state.currentScenario,
        progress: state.progress,
        allLevels: ALL_LEVELS,
        view: state.view,
        switchLevel,
        goToNextLevel,
        retry,
        recordScore,
        showSelector,
        sessionKey,
        scores,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}
