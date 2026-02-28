// components/panels/ConflictPicker/ConflictPicker.tsx — Three-panel merge conflict editor
// Inspired by VS Code / JetBrains merge editors:
//   Left (ours) | Center (result) | Right (theirs)

import { useState, useCallback } from 'react';

import type { RepoState, WorkingFile } from '@/engine/types';

interface ConflictPickerProps {
  /** The file currently in conflict */
  filename: string;
  /** The conflicted file data */
  file: WorkingFile;
  /** Callback when the user resolves the conflict */
  onResolve: (filename: string, resolvedContent: string) => void;
  /** Callback to dismiss without resolving */
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Line-level diff utilities
// ---------------------------------------------------------------------------

type LineStatus = 'unchanged' | 'added' | 'removed' | 'modified';

interface DiffLine {
  text: string;
  status: LineStatus;
}

/**
 * Compare lines of a version against the ancestor to determine which lines
 * were added, removed, or modified. Uses a simple per-line comparison.
 */
function diffLines(ancestorText: string, versionText: string): DiffLine[] {
  const ancestorLines = ancestorText.split('\n');
  const versionLines = versionText.split('\n');
  const result: DiffLine[] = [];

  const maxLen = Math.max(ancestorLines.length, versionLines.length);

  for (let i = 0; i < maxLen; i++) {
    const aLine = i < ancestorLines.length ? ancestorLines[i] : undefined;
    const vLine = i < versionLines.length ? versionLines[i] : undefined;

    if (vLine === undefined) {
      // Line was deleted in this version (ancestor had it, version doesn't)
      continue; // We only show lines that exist in the version
    }

    if (aLine === undefined) {
      // Line was added (version has it, ancestor doesn't)
      result.push({ text: vLine, status: 'added' });
    } else if (aLine === vLine) {
      result.push({ text: vLine, status: 'unchanged' });
    } else {
      result.push({ text: vLine, status: 'modified' });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Read-only side panel showing a version's lines with diff highlighting */
function SidePanel({
  title,
  titleColor,
  borderColor,
  diffResult,
  highlightBg,
}: {
  title: string;
  titleColor: string;
  borderColor: string;
  diffResult: DiffLine[];
  highlightBg: string;
}) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div
        className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 ${titleColor} border-b ${borderColor} bg-panel-800/50`}
      >
        {title}
      </div>
      <div className="flex-1 overflow-auto bg-panel-950 font-mono text-xs leading-5">
        {diffResult.map((line, i) => (
          <div
            key={i}
            className={`flex ${
              line.status !== 'unchanged' ? highlightBg : ''
            }`}
          >
            <span className="w-8 flex-shrink-0 text-right pr-2 text-panel-600 select-none border-r border-panel-800">
              {i + 1}
            </span>
            <pre className="px-2 whitespace-pre-wrap break-all flex-1">
              {line.text}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Center result panel with editable textarea and line numbers */
function ResultPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const lines = value.split('\n');

  return (
    <div className="flex flex-col flex-1 min-w-0 border-x border-panel-700">
      <div className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 text-panel-400 border-b border-panel-700 bg-panel-800/50">
        Result
      </div>
      <div className="flex-1 relative overflow-auto bg-panel-900">
        {/* Line numbers (non-interactive overlay) */}
        <div className="absolute left-0 top-0 bottom-0 w-8 font-mono text-xs leading-5 pointer-events-none z-10">
          {lines.map((_, i) => (
            <div
              key={i}
              className="text-right pr-2 text-panel-600 border-r border-panel-800 select-none"
            >
              {i + 1}
            </div>
          ))}
        </div>
        {/* Editable textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-gray-100 font-mono text-xs leading-5 pl-10 pr-2 py-0 resize-none outline-none caret-accent-400"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConflictPicker({
  filename,
  file,
  onResolve,
  onDismiss,
}: ConflictPickerProps) {
  const oursContent = file.conflictOurs ?? '';
  const theirsContent = file.conflictTheirs ?? '';
  const ancestorContent = file.conflictAncestor ?? '';

  // The editable result starts as the ancestor content so the player sees a
  // neutral starting point and can choose what to keep.
  const [result, setResult] = useState(ancestorContent);

  const acceptOurs = useCallback(() => setResult(oursContent), [oursContent]);
  const acceptTheirs = useCallback(
    () => setResult(theirsContent),
    [theirsContent],
  );
  const handleApply = useCallback(
    () => onResolve(filename, result),
    [onResolve, filename, result],
  );

  // Compute diffs against the ancestor for highlighting
  const oursDiff = diffLines(ancestorContent, oursContent);
  const theirsDiff = diffLines(ancestorContent, theirsContent);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-panel-800 border border-accent-500/20 rounded-lg shadow-2xl shadow-accent-900/10 w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header bar */}
        <div className="px-4 py-2 border-b border-accent-500/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-red-400">
              &#x23FA; Merge Conflict
            </h2>
            <span className="text-xs text-panel-400 font-mono">
              {filename}
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-panel-500 hover:text-accent-400 transition-colors font-mono text-sm"
          >
            &#x2715;
          </button>
        </div>

        {/* Action toolbar */}
        <div className="px-4 py-1.5 border-b border-panel-700 flex items-center gap-2 flex-shrink-0 bg-panel-800/80">
          <button
            onClick={acceptOurs}
            className="px-3 py-1 bg-blue-600/80 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
          >
            Accept Current
          </button>
          <button
            onClick={acceptTheirs}
            className="px-3 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors"
          >
            Accept Incoming
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-panel-500 mr-2">
            Edit the result panel or pick a side, then apply
          </span>
          <button
            onClick={handleApply}
            className="px-4 py-1 bg-accent-500 hover:bg-accent-400 text-panel-950 text-xs font-bold rounded transition-colors"
          >
            Apply Resolution
          </button>
        </div>

        {/* Three-panel editor */}
        <div className="flex flex-1 min-h-0 text-panel-400">
          {/* Left: Ours (current branch) */}
          <SidePanel
            title="Current (Ours)"
            titleColor="text-blue-400"
            borderColor="border-blue-900/50"
            diffResult={oursDiff}
            highlightBg="bg-blue-950/40"
          />

          {/* Center: Editable result */}
          <ResultPanel value={result} onChange={setResult} />

          {/* Right: Theirs (incoming branch) */}
          <SidePanel
            title="Incoming (Theirs)"
            titleColor="text-emerald-400"
            borderColor="border-emerald-900/50"
            diffResult={theirsDiff}
            highlightBg="bg-emerald-950/40"
          />
        </div>

        {/* Footer with legend */}
        <div className="px-4 py-1.5 border-t border-panel-700 flex items-center gap-4 flex-shrink-0 text-[10px] text-panel-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-blue-950/60 border border-blue-800/30" />
            Changed in current
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-emerald-950/60 border border-emerald-800/30" />
            Changed in incoming
          </span>
          <span className="flex items-center gap-1">
            Unmarked lines are unchanged from the common ancestor
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Resolve a conflict in the repo state by replacing the conflicted file
 * with the resolved content (status changes from 'conflicted' to 'modified').
 * The player will still need to `git add` and `git commit` to complete the merge.
 */
export function resolveConflict(
  state: RepoState,
  filename: string,
  resolvedContent: string,
): RepoState {
  const file = state.workingTree.files[filename];
  if (!file || file.status !== 'conflicted') {
    return state;
  }

  return {
    ...state,
    workingTree: {
      files: {
        ...state.workingTree.files,
        [filename]: {
          status: 'modified',
          content: resolvedContent,
        },
      },
    },
  };
}
