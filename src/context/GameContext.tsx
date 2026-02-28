// context/GameContext.tsx — Global game state: level navigation + score persistence

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
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'gitquest-scores';

interface SavedScores {
  [levelId: string]: number; // best star score (1-3)
}

function loadScores(): SavedScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedScores) : {};
  } catch {
    return {};
  }
}

function saveScores(scores: SavedScores): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// State + reducer
// ---------------------------------------------------------------------------

interface GameState {
  currentScenario: Scenario;
  scores: SavedScores;
}

type GameAction =
  | { type: 'SWITCH_LEVEL'; scenario: Scenario }
  | { type: 'RECORD_SCORE'; levelId: string; score: number };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SWITCH_LEVEL':
      return { ...state, currentScenario: action.scenario };

    case 'RECORD_SCORE': {
      const prev = state.scores[action.levelId] ?? 0;
      // Only save if new score is better (higher stars)
      if (action.score <= prev) return state;
      const updated = { ...state.scores, [action.levelId]: action.score };
      saveScores(updated);
      return { ...state, scores: updated };
    }

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
  /** Saved best scores keyed by level id */
  scores: SavedScores;
  /** All available levels */
  allLevels: Scenario[];
  /** Switch to a specific level */
  switchLevel: (scenario: Scenario) => void;
  /** Move to the next level (returns false if there is no next level) */
  goToNextLevel: () => boolean;
  /** Retry the current level (triggers a reset via key change) */
  retry: () => void;
  /** Record a score for a level (persists best to localStorage) */
  recordScore: (levelId: string, score: number) => void;
  /** Incrementing key to force remount on retry / level switch */
  sessionKey: number;
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
    scores: loadScores(),
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
    // Just bump session key — scenario stays the same, but components remount
    bumpSessionKey();
  }, [bumpSessionKey]);

  const recordScore = useCallback(
    (levelId: string, score: number) => {
      dispatch({ type: 'RECORD_SCORE', levelId, score });
    },
    [],
  );

  // Sync scores to localStorage whenever they change
  useEffect(() => {
    saveScores(state.scores);
  }, [state.scores]);

  return (
    <GameContext.Provider
      value={{
        currentScenario: state.currentScenario,
        scores: state.scores,
        allLevels: ALL_LEVELS,
        switchLevel,
        goToNextLevel,
        retry,
        recordScore,
        sessionKey,
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
