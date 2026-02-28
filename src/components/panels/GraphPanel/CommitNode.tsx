// components/panels/GraphPanel/CommitNode.tsx — A single commit node in the graph

import type { Commit, RepoState } from '@/engine/types';
import { resolveHead } from '@/engine/refs';

interface CommitNodeProps {
  commit: Commit;
  x: number;
  y: number;
  state: RepoState;
  color: string;
}

export function CommitNode({ commit, x, y, state, color }: CommitNodeProps) {
  const headHash = resolveHead(state);
  const isHead = headHash === commit.hash;

  // Gather decorations
  const decorations: string[] = [];

  if (isHead && state.head.type === 'branch') {
    decorations.push(`HEAD -> ${state.head.name}`);
  } else if (isHead && state.head.type === 'detached') {
    decorations.push('HEAD');
  }

  for (const [branchName, branchHash] of Object.entries(state.branches)) {
    if (branchHash === commit.hash) {
      if (isHead && state.head.type === 'branch' && state.head.name === branchName) {
        continue;
      }
      decorations.push(branchName);
    }
  }

  for (const [remoteBranch, remoteHash] of Object.entries(state.remote.branches)) {
    if (remoteHash === commit.hash) {
      decorations.push(`${state.remote.name}/${remoteBranch}`);
    }
  }

  const decoText = decorations.length > 0 ? `(${decorations.join(', ')})` : '';

  return (
    <g className="transition-all duration-300 ease-in-out">
      {/* Commit circle */}
      <circle
        cx={x}
        cy={y}
        r={6}
        fill={isHead ? '#fbbf24' : color}
        stroke={isHead ? '#f59e0b' : '#6b7280'}
        strokeWidth={isHead ? 2.5 : 1.5}
      />

      {/* Hash */}
      <text
        x={x + 14}
        y={y + 1}
        className="fill-gray-400 text-[11px]"
        fontFamily="monospace"
        dominantBaseline="middle"
      >
        {commit.hash.slice(0, 7)}
      </text>

      {/* Decorations */}
      {decoText && (
        <text
          x={x + 72}
          y={y + 1}
          className="fill-yellow-400 text-[11px] font-semibold"
          fontFamily="monospace"
          dominantBaseline="middle"
        >
          {decoText}
        </text>
      )}

      {/* Message */}
      <text
        x={x + 14}
        y={y + 16}
        className="fill-gray-300 text-[11px]"
        fontFamily="monospace"
        dominantBaseline="middle"
      >
        {commit.message}
      </text>
    </g>
  );
}
