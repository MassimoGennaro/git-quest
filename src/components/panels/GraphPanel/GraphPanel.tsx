// components/panels/GraphPanel/GraphPanel.tsx — SVG git graph renderer

import type { Commit, RepoState } from '@/engine/types';
import type { TargetStateSpec } from '@/levels/schema';
import { resolveHead } from '@/engine/refs';
import { getCommit } from '@/engine/store';
import { CommitNode } from './CommitNode';
import { GhostOverlay } from './GhostOverlay';

interface GraphPanelProps {
  state: RepoState;
  targetState?: TargetStateSpec;
  startingState?: RepoState;
}

/** Branch lane colors */
const LANE_COLORS = [
  '#60a5fa', // blue
  '#34d399', // green
  '#f472b6', // pink
  '#a78bfa', // purple
  '#fb923c', // orange
  '#38bdf8', // sky
  '#facc15', // yellow
];

interface LayoutNode {
  commit: Commit;
  x: number;
  y: number;
  lane: number;
}

/**
 * Walk the commit graph from HEAD, topological sort (newest first).
 * Assign each commit a lane (x) and row (y).
 */
function layoutGraph(state: RepoState): LayoutNode[] {
  const headHash = resolveHead(state);
  if (!headHash) return [];

  // Collect all reachable commits from all branches
  const visited = new Set<string>();
  const order: Commit[] = [];
  const queue: string[] = [];

  // Start from all branch tips to get full graph
  for (const hash of Object.values(state.branches)) {
    if (hash && !visited.has(hash)) {
      queue.push(hash);
    }
  }

  while (queue.length > 0) {
    const hash = queue.shift()!;
    if (visited.has(hash)) continue;
    visited.add(hash);

    const c = getCommit(state, hash);
    if (!c) continue;
    order.push(c);

    for (const ph of c.parentHashes) {
      if (!visited.has(ph)) {
        queue.push(ph);
      }
    }
  }

  // Sort newest first
  order.sort((a, b) => b.timestamp - a.timestamp);

  // Assign lanes: figure out which branch each commit "belongs to"
  // Simple heuristic: HEAD branch gets lane 0, other branches get lanes 1+
  const branchLanes: Record<string, number> = {};
  let nextLane = 0;

  // HEAD branch first
  if (state.head.type === 'branch') {
    branchLanes[state.head.name] = nextLane++;
  }

  // Other branches
  for (const branchName of Object.keys(state.branches)) {
    if (!(branchName in branchLanes)) {
      branchLanes[branchName] = nextLane++;
    }
  }

  // Map each commit to a lane by finding which branch tip reaches it first
  const commitLane = new Map<string, number>();

  for (const [branchName, branchHash] of Object.entries(state.branches)) {
    const lane = branchLanes[branchName] ?? 0;
    const branchVisited = new Set<string>();
    const bfsQueue = [branchHash];

    while (bfsQueue.length > 0) {
      const h = bfsQueue.shift()!;
      if (branchVisited.has(h)) continue;
      branchVisited.add(h);

      // Only assign if not already assigned
      if (!commitLane.has(h)) {
        commitLane.set(h, lane);
      }

      const c = getCommit(state, h);
      if (c) {
        for (const ph of c.parentHashes) {
          if (!branchVisited.has(ph)) {
            bfsQueue.push(ph);
          }
        }
      }
    }
  }

  // Layout constants
  const LANE_WIDTH = 30;
  const ROW_HEIGHT = 50;
  const LEFT_MARGIN = 30;
  const TOP_MARGIN = 30;

  return order.map((commit, index) => {
    const lane = commitLane.get(commit.hash) ?? 0;
    return {
      commit,
      x: LEFT_MARGIN + lane * LANE_WIDTH,
      y: TOP_MARGIN + index * ROW_HEIGHT,
      lane,
    };
  });
}

export function GraphPanel({ state, targetState, startingState }: GraphPanelProps) {
  const nodes = layoutGraph(state);

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-sm">
        No commits yet. Try "git add" and "git commit".
      </div>
    );
  }

  // Build a lookup from hash -> position for drawing edges
  const posMap = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    posMap.set(node.commit.hash, { x: node.x, y: node.y });
  }

  // Calculate ghost overlay dimensions
  const ghostTargetCount = targetState
    ? targetState.branches.length +
      (targetState.remoteBranches?.length ?? 0) +
      1 // HEAD line
    : 0;
  const ghostHeight = targetState ? ghostTargetCount * 32 + 40 : 0;
  const graphBottomY = nodes.length * 50 + 60;

  const svgHeight = graphBottomY + ghostHeight;
  const maxLane = Math.max(...nodes.map((n) => n.lane), 0);
  const svgWidth = Math.max(500, (maxLane + 1) * 30 + 400);

  return (
    <div className="flex-1 overflow-auto bg-gray-900 p-2">
      <svg width={svgWidth} height={svgHeight} className="transition-all duration-300">
        {/* Edges: draw lines from each commit to its parents */}
        {nodes.map((node) =>
          node.commit.parentHashes.map((parentHash) => {
            const parentPos = posMap.get(parentHash);
            if (!parentPos) return null;
            const key = `${node.commit.hash}-${parentHash}`;

            if (node.x === parentPos.x) {
              // Straight vertical line
              return (
                <line
                  key={key}
                  x1={node.x}
                  y1={node.y + 6}
                  x2={parentPos.x}
                  y2={parentPos.y - 6}
                  stroke={LANE_COLORS[node.lane % LANE_COLORS.length]}
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  className="transition-all duration-300"
                />
              );
            }

            // Curved path for cross-lane edges
            const midY = (node.y + parentPos.y) / 2;
            return (
              <path
                key={key}
                d={`M ${node.x} ${node.y + 6} C ${node.x} ${midY}, ${parentPos.x} ${midY}, ${parentPos.x} ${parentPos.y - 6}`}
                fill="none"
                stroke={LANE_COLORS[node.lane % LANE_COLORS.length]}
                strokeWidth={2}
                strokeOpacity={0.6}
                className="transition-all duration-300"
              />
            );
          }),
        )}

        {/* Commit nodes */}
        {nodes.map((node) => (
          <CommitNode
            key={node.commit.hash}
            commit={node.commit}
            x={node.x}
            y={node.y}
            state={state}
            color={LANE_COLORS[node.lane % LANE_COLORS.length] ?? '#60a5fa'}
          />
        ))}

        {/* Ghost overlay: target state visualization */}
        {targetState && startingState && (
          <GhostOverlay
            target={targetState}
            state={state}
            startingState={startingState}
            yOffset={graphBottomY}
            xOffset={30}
          />
        )}
      </svg>
    </div>
  );
}
