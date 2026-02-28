// components/panels/RebasePicker/RebasePicker.tsx — Interactive rebase commit picker

import { useState, useCallback } from 'react';

import type { RebaseInteractiveInfo } from '@/engine/types';

export type RebaseAction = 'pick' | 'squash' | 'drop';

interface CommitAction {
  hash: string;
  message: string;
  action: RebaseAction;
}

interface RebasePickerProps {
  info: RebaseInteractiveInfo;
  onApply: (actions: Array<{ hash: string; action: RebaseAction }>) => void;
  onCancel: () => void;
}

const ACTION_COLORS: Record<RebaseAction, string> = {
  pick: 'bg-blue-600/80 text-blue-100',
  squash: 'bg-yellow-600/80 text-yellow-100',
  drop: 'bg-red-600/80 text-red-100',
};

const ACTION_LABELS: Record<RebaseAction, string> = {
  pick: 'pick',
  squash: 'squash',
  drop: 'drop',
};

export function RebasePicker({ info, onApply, onCancel }: RebasePickerProps) {
  const [commits, setCommits] = useState<CommitAction[]>(() =>
    info.commits.map((c) => ({
      hash: c.hash,
      message: c.message,
      action: 'pick' as RebaseAction,
    })),
  );

  const cycleAction = useCallback((index: number) => {
    setCommits((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const next: RebaseAction =
          c.action === 'pick'
            ? 'squash'
            : c.action === 'squash'
              ? 'drop'
              : 'pick';
        return { ...c, action: next };
      }),
    );
  }, []);

  const handleApply = useCallback(() => {
    onApply(
      commits.map((c) => ({ hash: c.hash, action: c.action })),
    );
  }, [commits, onApply]);

  // Validate: at least one pick
  const hasPick = commits.some((c) => c.action === 'pick');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl w-full max-w-xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-600">
          <h2 className="text-sm font-bold text-purple-400">
            Interactive Rebase
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Click the action badge to cycle: pick → squash → drop.
            Oldest commit is at the top.
          </p>
        </div>

        {/* Commit list */}
        <div className="flex-1 overflow-y-auto py-2 max-h-80">
          {commits.map((commit, i) => (
            <div
              key={commit.hash}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-750/50"
            >
              {/* Action badge (clickable) */}
              <button
                onClick={() => cycleAction(i)}
                className={`text-xs font-bold uppercase px-2 py-0.5 rounded min-w-[60px] text-center transition-colors ${ACTION_COLORS[commit.action]}`}
              >
                {ACTION_LABELS[commit.action]}
              </button>

              {/* Hash */}
              <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                {commit.hash.slice(0, 7)}
              </span>

              {/* Message */}
              <span className="text-sm text-gray-200 truncate">
                {commit.message}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <div className="text-[10px] text-gray-500">
            {!hasPick && (
              <span className="text-red-400">
                At least one commit must be picked.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!hasPick}
              className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
                hasPick
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Apply Rebase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
