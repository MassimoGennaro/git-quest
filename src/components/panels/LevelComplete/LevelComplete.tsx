// components/panels/LevelComplete/LevelComplete.tsx — Mission complete overlay with scoring

interface LevelCompleteProps {
  /** Level title */
  title: string;
  /** Number of stars earned (1-3) */
  score: number;
  /** Number of commands the player used */
  commandCount: number;
  /** Par for the level */
  par: number;
  /** Callback to go to next level */
  onNextLevel?: () => void;
  /** Callback to retry the level */
  onRetry: () => void;
  /** Callback to go to the level list */
  onShowSelector: () => void;
}

export function LevelComplete({
  title,
  score,
  commandCount,
  par,
  onNextLevel,
  onRetry,
  onShowSelector,
}: LevelCompleteProps) {
  const stars = Array.from({ length: 3 }, (_, i) => i < score);

  const getMessage = () => {
    if (score === 3) return 'Mission Perfect!';
    if (score === 2) return 'Mission Success!';
    return 'Mission Complete!';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-panel-800 border border-accent-500/20 rounded-lg shadow-2xl shadow-accent-900/10 max-w-sm w-full mx-4 text-center">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="text-xs font-semibold text-accent-400 uppercase tracking-wider mb-1 text-glow-sm">
            &#x2736; Mission Complete &#x2736;
          </div>
          <h2 className="text-xl font-bold text-gray-100">{title}</h2>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 py-4">
          {stars.map((filled, i) => (
            <svg
              key={i}
              className={`w-10 h-10 transition-all duration-500 ${
                filled ? 'text-accent-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-panel-600'
              }`}
              style={{
                animationDelay: `${i * 200}ms`,
                transform: filled ? 'scale(1)' : 'scale(0.8)',
              }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>

        {/* Score details */}
        <div className="px-6 pb-4">
          <p className="text-lg font-semibold text-accent-300 mb-2 text-glow-sm">
            {getMessage()}
          </p>
          <div className="text-sm text-panel-400 space-y-1">
            <p>
              Commands used:{' '}
              <span className="text-gray-200 font-mono">{commandCount}</span>
            </p>
            <p>
              Par:{' '}
              <span className="text-gray-200 font-mono">{par}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onShowSelector}
            className="flex-1 px-4 py-2 bg-panel-700 hover:bg-panel-600 text-panel-400 text-sm font-medium rounded transition-colors"
          >
            Level List
          </button>
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-panel-700 hover:bg-panel-600 text-panel-400 text-sm font-medium rounded transition-colors"
          >
            Retry
          </button>
          {onNextLevel && (
            <button
              onClick={onNextLevel}
              className="flex-1 px-4 py-2 bg-accent-500 hover:bg-accent-400 text-panel-950 text-sm font-bold rounded transition-colors shadow-glow-sm"
            >
              Next Level
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
