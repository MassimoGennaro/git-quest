// components/panels/LevelSelector/LevelSelector.tsx — Full-screen level selector

import type { Scenario } from '@/levels/schema';
import { TIER_TO_DIFFICULTY, DIFFICULTY_LABELS } from '@/levels/schema';
import type { SavedProgress } from '@/context/GameContext';

interface LevelSelectorProps {
  levels: Scenario[];
  progress: SavedProgress;
  onSelectLevel: (scenario: Scenario) => void;
}

/** Group levels by tier */
function groupByTier(levels: Scenario[]): Record<number, Scenario[]> {
  const groups: Record<number, Scenario[]> = {};
  for (const level of levels) {
    if (!groups[level.tier]) groups[level.tier] = [];
    groups[level.tier]!.push(level);
  }
  return groups;
}

const TIER_COLORS: Record<number, { badge: string; card: string; border: string }> = {
  1: {
    badge: 'bg-green-600/60 text-green-200',
    card: 'hover:border-green-500/40 hover:shadow-[0_0_12px_rgba(34,197,94,0.1)]',
    border: 'border-green-900/40',
  },
  2: {
    badge: 'bg-blue-600/60 text-blue-200',
    card: 'hover:border-blue-500/40 hover:shadow-[0_0_12px_rgba(59,130,246,0.1)]',
    border: 'border-blue-900/40',
  },
  3: {
    badge: 'bg-orange-600/60 text-orange-200',
    card: 'hover:border-orange-500/40 hover:shadow-[0_0_12px_rgba(249,115,22,0.1)]',
    border: 'border-orange-900/40',
  },
  4: {
    badge: 'bg-red-600/60 text-red-200',
    card: 'hover:border-red-500/40 hover:shadow-[0_0_12px_rgba(239,68,68,0.1)]',
    border: 'border-red-900/40',
  },
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? 'text-accent-400' : 'text-panel-600'} transition-colors`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

const ASCII_BANNER = `  \u2736 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2736
    \u2554\u2550\u2557\u2566\u2554\u2566\u2557  \u2554\u2550\u2557 \u2566 \u2566\u2554\u2550\u2557\u2554\u2550\u2557\u2554\u2566\u2557
    \u2551 \u2566\u2551 \u2551   \u2551\u2550\u256C\u2557\u2551 \u2551\u2551\u2563 \u255A\u2550\u2557 \u2551
    \u255A\u2550\u255D\u2569 \u2569   \u255A\u2550\u255D\u255A\u255A\u2550\u255D\u255A\u2550\u255D\u255A\u2550\u255D \u2569
  \u2736 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \u2736`;

export function LevelSelector({
  levels,
  progress,
  onSelectLevel,
}: LevelSelectorProps) {
  const tiers = groupByTier(levels);
  const tierNumbers = Object.keys(tiers)
    .map(Number)
    .sort((a, b) => a - b);

  const totalCompleted = Object.keys(progress).length;

  return (
    <div className="h-screen bg-panel-950 text-gray-100 flex flex-col font-mono">
      {/* Header with ASCII art banner */}
      <div className="px-6 py-6 border-b border-accent-400/20 bg-panel-900">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <pre className="text-accent-400 text-xs leading-tight text-glow select-none">
              {ASCII_BANNER}
            </pre>
            <p className="text-sm text-panel-400 mt-2 ml-2">
              Learn git by solving puzzles. Type real commands to transform
              repos.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-panel-400">
              {totalCompleted}/{levels.length} completed
            </div>
            <div className="w-32 h-1.5 bg-panel-700 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-accent-400 rounded-full transition-all duration-500 shadow-glow-sm"
                style={{
                  width: `${(totalCompleted / levels.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Level grid */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          {tierNumbers.map((tier) => {
            const tierLevels = tiers[tier] ?? [];
            const difficulty = TIER_TO_DIFFICULTY[tier as 1 | 2 | 3 | 4];
            const label = difficulty
              ? DIFFICULTY_LABELS[difficulty]
              : `Tier ${tier}`;
            const colors = TIER_COLORS[tier] ?? TIER_COLORS[1]!;

            return (
              <div key={tier}>
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colors.badge}`}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-panel-500">
                    Tier {tier} &middot; {tierLevels.length} levels
                  </span>
                  <div className="flex-1 h-px bg-panel-700" />
                </div>

                {/* Level cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {tierLevels.map((level) => {
                    const levelProgress = progress[level.id];
                    const isCompleted = !!levelProgress;
                    const stars = levelProgress?.stars ?? 0;
                    const bestMoves = levelProgress?.bestMoves;

                    return (
                      <button
                        key={level.id}
                        onClick={() => onSelectLevel(level)}
                        className={`text-left p-3 rounded-lg border border-panel-700 bg-panel-850/60 transition-all duration-200 ${colors.card} hover:bg-panel-800`}
                      >
                        {/* Title row */}
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-sm font-semibold text-gray-100 leading-tight">
                            {level.title}
                          </h3>
                          {isCompleted && (
                            <span className="text-term-400 text-xs flex-shrink-0 ml-1">
                              &#10003;
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-panel-400 leading-snug mb-2 line-clamp-2">
                          {level.description}
                        </p>

                        {/* Concepts */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {level.concepts.map((concept) => (
                            <span
                              key={concept}
                              className="text-[10px] text-panel-500 bg-panel-700/50 px-1.5 py-0.5 rounded"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>

                        {/* Stars + par info */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((s) => (
                              <StarIcon key={s} filled={s <= stars} />
                            ))}
                          </div>
                          <div className="text-[10px] text-panel-500 font-mono">
                            {bestMoves !== undefined ? (
                              <span>
                                best: {bestMoves}/{level.par}
                              </span>
                            ) : (
                              <span>par {level.par}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
