// components/panels/GraphPanel/GhostOverlay.tsx — Faded target state overlay

import type { TargetStateSpec } from '@/levels/schema';
import type { RepoState } from '@/engine/types';

interface GhostOverlayProps {
  target: TargetStateSpec;
  state: RepoState;
  /** The repo state at level start, used to check if branches have advanced */
  startingState: RepoState;
  /** Y offset to position ghosts below existing commits */
  yOffset: number;
  /** X position (left margin) */
  xOffset: number;
}

/**
 * Render a simplified ghost visualization of the target state.
 * Shows expected branch names using dashed strokes and 40% opacity.
 * Amber/green checkmarks appear when a branch requirement is satisfied.
 */
export function GhostOverlay({
  target,
  state,
  startingState,
  yOffset,
  xOffset,
}: GhostOverlayProps) {
  const branchItems: Array<{
    name: string;
    isSatisfied: boolean;
  }> = target.branches.map((branchName) => {
    const exists = !!state.branches[branchName];
    const startHash = startingState.branches[branchName];
    // Satisfied if: branch exists AND (it's new OR it has advanced from start)
    const advanced = !startHash || state.branches[branchName] !== startHash;
    return {
      name: branchName,
      isSatisfied: exists && advanced,
    };
  });

  const remoteItems: Array<{
    name: string;
    isSatisfied: boolean;
  }> = (target.remoteBranches ?? []).map((branchName) => {
    const exists = !!state.remote.branches[branchName];
    const startHash = startingState.remote.branches[branchName];
    const advanced = !startHash || state.remote.branches[branchName] !== startHash;
    return {
      name: `origin/${branchName}`,
      isSatisfied: exists && advanced,
    };
  });

  const ROW_HEIGHT = 28;
  const GHOST_X = xOffset + 10;

  return (
    <g opacity={0.5}>
      {/* Ghost label */}
      <text
        x={GHOST_X}
        y={yOffset}
        fill="#f59e0b"
        className="text-[10px] font-bold uppercase tracking-wider"
        fontFamily="'JetBrains Mono', monospace"
        dominantBaseline="middle"
      >
        &#x2736; TARGET STATE
      </text>

      {/* Ghost branch nodes */}
      {branchItems.map((branch, i) => {
        const ghostY = yOffset + 24 + i * ROW_HEIGHT;

        return (
          <g key={`ghost-${branch.name}`}>
            <circle
              cx={GHOST_X}
              cy={ghostY}
              r={5}
              fill={branch.isSatisfied ? '#34d399' : 'none'}
              stroke={branch.isSatisfied ? '#34d399' : '#3d4059'}
              strokeWidth={1.5}
              strokeDasharray={branch.isSatisfied ? 'none' : '3,2'}
            />

            {branch.isSatisfied && (
              <text
                x={GHOST_X}
                y={ghostY + 1}
                fill="#0c0d11"
                className="text-[8px] font-bold"
                fontFamily="'JetBrains Mono', monospace"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                &#x2713;
              </text>
            )}

            <text
              x={GHOST_X + 14}
              y={ghostY}
              className="text-[11px] font-semibold"
              fill={branch.isSatisfied ? '#34d399' : '#555873'}
              fontFamily="'JetBrains Mono', monospace"
              dominantBaseline="middle"
            >
              {branch.name}
            </text>
          </g>
        );
      })}

      {/* Ghost remote branches */}
      {remoteItems.map((remote, i) => {
        const ghostY =
          yOffset + 24 + branchItems.length * ROW_HEIGHT + i * ROW_HEIGHT;

        return (
          <g key={`ghost-remote-${remote.name}`}>
            <circle
              cx={GHOST_X}
              cy={ghostY}
              r={5}
              fill={remote.isSatisfied ? '#34d399' : 'none'}
              stroke={remote.isSatisfied ? '#34d399' : '#3d4059'}
              strokeWidth={1.5}
              strokeDasharray={remote.isSatisfied ? 'none' : '3,2'}
            />

            {remote.isSatisfied && (
              <text
                x={GHOST_X}
                y={ghostY + 1}
                fill="#0c0d11"
                className="text-[8px] font-bold"
                fontFamily="'JetBrains Mono', monospace"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                &#x2713;
              </text>
            )}

            <text
              x={GHOST_X + 14}
              y={ghostY}
              className="text-[11px] font-semibold"
              fill={remote.isSatisfied ? '#34d399' : '#555873'}
              fontFamily="'JetBrains Mono', monospace"
              dominantBaseline="middle"
            >
              {remote.name}
            </text>
          </g>
        );
      })}

      {/* HEAD target */}
      {target.head.type === 'branch' && (
        <g>
          {(() => {
            const allItems = [...branchItems, ...remoteItems];
            const ghostY = yOffset + 24 + allItems.length * ROW_HEIGHT;
            const isHeadSatisfied =
              state.head.type === 'branch' &&
              state.head.name === target.head.name;

            return (
              <text
                x={GHOST_X + 14}
                y={ghostY}
                className="text-[11px] font-semibold"
                fill={isHeadSatisfied ? '#34d399' : '#f59e0b'}
                fontFamily="'JetBrains Mono', monospace"
                dominantBaseline="middle"
              >
                HEAD &#x2192; {target.head.name}{' '}
                {isHeadSatisfied ? '\u2713' : ''}
              </text>
            );
          })()}
        </g>
      )}
    </g>
  );
}
