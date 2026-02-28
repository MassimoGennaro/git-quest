// App.tsx — Root component: GameProvider + level session

import { GameProvider, useGame } from '@/context/GameContext';
import { useLevel } from '@/hooks/useLevel';
import { AppLayout } from '@/components/layout/AppLayout';

function GameSession() {
  const {
    currentScenario,
    goToNextLevel,
    retry,
    recordScore,
    sessionKey,
  } = useGame();

  return (
    <GameSessionInner
      key={sessionKey}
      scenario={currentScenario}
      onNextLevel={goToNextLevel}
      onRetry={retry}
      onRecordScore={recordScore}
    />
  );
}

/** Inner component that actually runs useLevel — remounts on sessionKey change */
function GameSessionInner({
  scenario,
  onNextLevel,
  onRetry,
  onRecordScore,
}: {
  scenario: ReturnType<typeof useGame>['currentScenario'];
  onNextLevel: () => boolean;
  onRetry: () => void;
  onRecordScore: (levelId: string, score: number) => void;
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
    // This is safe because recordScore only updates if the score is better
    onRecordScore(scenario.id, level.score);
  }

  return (
    <AppLayout
      level={level}
      onNextLevel={handleNextLevel}
      onRetry={handleRetry}
    />
  );
}

export function App() {
  return (
    <GameProvider>
      <GameSession />
    </GameProvider>
  );
}
