// components/panels/GraphPanel/CommitNode.tsx — A single commit node in the graph

import type { Commit, RepoState } from '@/engine/types';
import { resolveHead } from '@/engine/refs';

interface CommitNodeProps {
  commit: Commit;
  x: number;
  y: number;
  textX: number;
  state: RepoState;
  color: string;
  isActive: boolean;
}

export function CommitNode({ commit, x, y, textX, state, color, isActive }: CommitNodeProps) {
  const headHash = resolveHead(state);
  const isHead = headHash === commit.hash;

  // Gather decorations
  const decorations: string[] = [];

  if (isHead && state.head.type === 'branch') {
    decorations.push(`HEAD \u2192 ${state.head.name}`);
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

  // Visual intensity based on active state
  const hashFill = isActive ? '#555873' : '#333548';
  const messageFill = isActive ? '#8b8ea5' : '#444660';
  const decoFill = isActive ? '#f59e0b' : '#6b5a2e';
  const circleFill = isHead ? '#f59e0b' : isActive ? color : `${color}66`;
  const circleStroke = isHead ? '#fbbf24' : isActive ? '#3d4059' : '#2a2c3e';
  const circleStrokeWidth = isHead ? 2.5 : isActive ? 1.5 : 1;

  return (
    <g className="transition-all duration-300 ease-in-out">
      {/* HEAD glow ring */}
      {isHead && (
        <circle
          cx={x}
          cy={y}
          r={10}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1}
          strokeOpacity={0.3}
          filter="url(#glow-amber)"
        />
      )}

      {/* Commit circle */}
      <circle
        cx={x}
        cy={y}
        r={isActive ? 6 : 4}
        fill={circleFill}
        stroke={circleStroke}
        strokeWidth={circleStrokeWidth}
        {...(isHead ? { filter: 'url(#glow-amber)' } : {})}
      />

      {/* Hash */}
      <text
        x={textX}
        y={y + 1}
        fill={hashFill}
        className="text-[11px]"
        fontFamily="'JetBrains Mono', monospace"
        dominantBaseline="middle"
      >
        {commit.hash.slice(0, 7)}
      </text>

      {/* Decorations */}
      {decoText && (
        <text
          x={textX + 62}
          y={y + 1}
          fill={decoFill}
          className="text-[11px] font-semibold"
          fontFamily="'JetBrains Mono', monospace"
          dominantBaseline="middle"
        >
          {isHead ? '\u2736 ' : ''}{decoText}
        </text>
      )}

      {/* Message */}
      <text
        x={textX}
        y={y + 16}
        fill={messageFill}
        className="text-[11px]"
        fontFamily="'JetBrains Mono', monospace"
        dominantBaseline="middle"
      >
        {commit.message}
      </text>
    </g>
  );
}
