// App.tsx — Root component: view routing between LevelSelector and GameSession

import { GameProvider, useGame } from '@/context/GameContext';
import { useLevel } from '@/hooks/useLevel';
import { AppLayout } from '@/components/layout/AppLayout';
import { LevelSelector } from '@/components/panels/LevelSelector/LevelSelector';

function GameRouter() {
  const { view } = useGame();

  if (view === 'selector') {
    return <LevelSelectorView />;
  }

  return <GameSession />;
}

function LevelSelectorView() {
  const { allLevels, progress, switchLevel } = useGame();

  return (
    <LevelSelector
      levels={allLevels}
      progress={progress}
      onSelectLevel={switchLevel}
    />
  );
}

function GameSession() {
  const {
    currentScenario,
    goToNextLevel,
    retry,
    recordScore,
    showSelector,
    sessionKey,
  } = useGame();

  return (
    <GameSessionInner
      key={sessionKey}
      scenario={currentScenario}
      onNextLevel={goToNextLevel}
      onRetry={retry}
      onRecordScore={recordScore}
      onShowSelector={showSelector}
    />
  );
}

/** Inner component that actually runs useLevel — remounts on sessionKey change */
function GameSessionInner({
  scenario,
  onNextLevel,
  onRetry,
  onRecordScore,
  onShowSelector,
}: {
  scenario: ReturnType<typeof useGame>['currentScenario'];
  onNextLevel: () => boolean;
  onRetry: () => void;
  onRecordScore: (levelId: string, stars: number, moves: number) => void;
  onShowSelector: () => void;
}) {
  const level = useLevel(scenario);

  const handleNextLevel = () => {
    onNextLevel();
  };

  const handleRetry = () => {
    onRetry();
  };

  // Record score when level is won
  if (level.isWon) {
    onRecordScore(scenario.id, level.score, level.engine.commandCount);
  }

  return (
    <AppLayout
      level={level}
      onNextLevel={handleNextLevel}
      onRetry={handleRetry}
      onShowSelector={onShowSelector}
    />
  );
}

export function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
