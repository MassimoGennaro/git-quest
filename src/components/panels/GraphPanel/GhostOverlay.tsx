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
 * Shows expected branch names with optional descriptions using dashed strokes.
 * Amber/green checkmarks appear when a branch requirement is satisfied.
 */
export function GhostOverlay({
  target,
  state,
  startingState,
  yOffset,
  xOffset,
}: GhostOverlayProps) {
  const descriptions = target.descriptions;

  const branchItems: Array<{
    name: string;
    description?: string;
    isSatisfied: boolean;
  }> = target.branches.map((branchName) => {
    const exists = !!state.branches[branchName];
    const startHash = startingState.branches[branchName];
    // Satisfied if: branch exists AND (it's new OR it has advanced from start)
    const advanced = !startHash || state.branches[branchName] !== startHash;
    return {
      name: branchName,
      description: descriptions?.branches?.[branchName],
      isSatisfied: exists && advanced,
    };
  });

  const remoteItems: Array<{
    name: string;
    description?: string;
    isSatisfied: boolean;
  }> = (target.remoteBranches ?? []).map((branchName) => {
    const exists = !!state.remote.branches[branchName];
    const startHash = startingState.remote.branches[branchName];
    const advanced = !startHash || state.remote.branches[branchName] !== startHash;
    return {
      name: `origin/${branchName}`,
      description: descriptions?.remoteBranches?.[branchName],
      isSatisfied: exists && advanced,
    };
  });

  // Working tree satisfaction check
  const showWorkingTree = target.workingTreeClean;
  const isWorkingTreeSatisfied = showWorkingTree
    ? Object.keys(state.index).length === 0 &&
      Object.keys(state.workingTree.files).length === 0
    : false;

  const ROW_HEIGHT = 28;
  const GHOST_X = xOffset + 10;
  const LABEL_X = GHOST_X + 14;
  const FONT = "'JetBrains Mono', monospace";

  // Colors
  const SATISFIED_COLOR = '#34d399';
  const UNSATISFIED_COLOR = '#3d4059';
  const UNSATISFIED_TEXT = '#555873';
  const DESC_UNSATISFIED = '#44475a';
  const DESC_SATISFIED = '#2ab383';
  const CHECK_BG = '#0c0d11';

  const renderRow = (
    y: number,
    name: string,
    description: string | undefined,
    isSatisfied: boolean,
    key: string,
  ) => (
    <g key={key}>
      {/* Check circle */}
      <circle
        cx={GHOST_X}
        cy={y}
        r={5}
        fill={isSatisfied ? SATISFIED_COLOR : 'none'}
        stroke={isSatisfied ? SATISFIED_COLOR : UNSATISFIED_COLOR}
        strokeWidth={1.5}
        strokeDasharray={isSatisfied ? 'none' : '3,2'}
      />
      {isSatisfied && (
        <text
          x={GHOST_X}
          y={y + 1}
          fill={CHECK_BG}
          fontSize={8}
          fontWeight="bold"
          fontFamily={FONT}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          &#x2713;
        </text>
      )}
      {/* Label */}
      <text
        x={LABEL_X}
        y={y}
        fontSize={11}
        fontWeight={600}
        fill={isSatisfied ? SATISFIED_COLOR : UNSATISFIED_TEXT}
        fontFamily={FONT}
        dominantBaseline="middle"
      >
        {name}
      </text>
      {/* Description */}
      {description && (
        <text
          x={LABEL_X}
          y={y + 14}
          fontSize={10}
          fontWeight={400}
          fill={isSatisfied ? DESC_SATISFIED : DESC_UNSATISFIED}
          fontFamily={FONT}
          dominantBaseline="middle"
        >
          {description}
        </text>
      )}
    </g>
  );

  // Use a taller row height when descriptions are present to fit the second line
  const hasDescriptions = !!descriptions;
  const EFFECTIVE_ROW_HEIGHT = hasDescriptions ? 38 : ROW_HEIGHT;

  return (
    <g opacity={0.5}>
      {/* Ghost label */}
      <text
        x={GHOST_X}
        y={yOffset}
        fill="#f59e0b"
        fontSize={10}
        fontWeight="bold"
        fontFamily={FONT}
        dominantBaseline="middle"
        letterSpacing="0.05em"
        style={{ textTransform: 'uppercase' }}
      >
        &#x2736; TARGET STATE
      </text>

      {/* Ghost branch nodes */}
      {branchItems.map((branch, i) =>
        renderRow(
          yOffset + 24 + i * EFFECTIVE_ROW_HEIGHT,
          branch.name,
          branch.description,
          branch.isSatisfied,
          `ghost-branch-${branch.name}`,
        ),
      )}

      {/* Ghost remote branches */}
      {remoteItems.map((remote, i) =>
        renderRow(
          yOffset + 24 + (branchItems.length + i) * EFFECTIVE_ROW_HEIGHT,
          remote.name,
          remote.description,
          remote.isSatisfied,
          `ghost-remote-${remote.name}`,
        ),
      )}

      {/* Working tree row */}
      {showWorkingTree && (() => {
        const rowIndex = branchItems.length + remoteItems.length;
        const ghostY = yOffset + 24 + rowIndex * EFFECTIVE_ROW_HEIGHT;
        const wtDesc = descriptions?.workingTree ?? 'clean working tree';

        return renderRow(
          ghostY,
          'working tree',
          wtDesc,
          isWorkingTreeSatisfied,
          'ghost-working-tree',
        );
      })()}

      {/* HEAD target */}
      {target.head.type === 'branch' && (() => {
        const rowIndex =
          branchItems.length +
          remoteItems.length +
          (showWorkingTree ? 1 : 0);
        const ghostY = yOffset + 24 + rowIndex * EFFECTIVE_ROW_HEIGHT;
        const isHeadSatisfied =
          state.head.type === 'branch' &&
          state.head.name === target.head.name;
        const headLabel = `HEAD \u2192 ${target.head.name}`;

        return renderRow(
          ghostY,
          headLabel,
          descriptions?.head,
          isHeadSatisfied,
          'ghost-head',
        );
      })()}
    </g>
  );
}
