// components/panels/GraphPanel/GraphPanel.tsx — SVG git graph renderer

import { useRef } from 'react';

import type { Commit, RepoState } from '@/engine/types';
import type { TargetStateSpec } from '@/levels/schema';
import { resolveHead } from '@/engine/refs';
import { CommitNode } from './CommitNode';
import { GhostOverlay } from './GhostOverlay';

interface GraphPanelProps {
  state: RepoState;
  targetState?: TargetStateSpec;
  startingState?: RepoState;
  /** Commands the player has executed so far (git subcommand names) */
  executedCommands?: string[];
}

/** Warm-shifted lane colors */
const LANE_COLORS = [
  '#f59e0b', // amber (primary)
  '#34d399', // emerald
  '#f472b6', // pink
  '#a78bfa', // purple
  '#60a5fa', // blue
  '#fb923c', // orange
  '#38bdf8', // sky
];

interface LayoutNode {
  commit: Commit;
  x: number;
  y: number;
  lane: number;
  textX: number;
  isActive: boolean;
}

/**
 * Compute the set of all commit hashes reachable from HEAD.
 * This is the "active" branch — the path the player is currently on.
 */
function computeActiveSet(state: RepoState, allCommits: Record<string, Commit>): Set<string> {
  const active = new Set<string>();
  const headHash = resolveHead(state);
  if (!headHash) return active;

  const queue = [headHash];
  while (queue.length > 0) {
    const hash = queue.shift()!;
    if (active.has(hash)) continue;
    active.add(hash);

    const c = allCommits[hash];
    if (c) {
      for (const ph of c.parentHashes) {
        if (!active.has(ph)) {
          queue.push(ph);
        }
      }
    }
  }
  return active;
}

/**
 * Walk the commit graph, assign lanes and rows.
 * Takes allCommits (the full ever-seen store) so that orphaned commits
 * (unreachable from any branch tip after reset/delete) still appear.
 */
function layoutGraph(
  state: RepoState,
  allCommits: Record<string, Commit>,
  activeSet: Set<string>,
): LayoutNode[] {
  const headHash = resolveHead(state);

  // Collect all reachable commits from all branch tips + detached HEAD + orphans
  const visited = new Set<string>();
  const order: Commit[] = [];
  const queue: string[] = [];

  // Start from all branch tips
  for (const hash of Object.values(state.branches)) {
    if (hash && !visited.has(hash)) {
      queue.push(hash);
    }
  }

  // Also include detached HEAD as a root (so detached HEAD commits are visible)
  if (headHash && !visited.has(headHash)) {
    queue.push(headHash);
  }

  // BFS from branch tips and HEAD
  while (queue.length > 0) {
    const hash = queue.shift()!;
    if (visited.has(hash)) continue;
    visited.add(hash);

    const c = allCommits[hash];
    if (!c) continue;
    order.push(c);

    for (const ph of c.parentHashes) {
      if (!visited.has(ph)) {
        queue.push(ph);
      }
    }
  }

  // Now add any orphaned commits (in allCommits but not reachable from current branches/HEAD).
  // These are commits that were abandoned by git reset or branch -d.
  for (const [hash, commit] of Object.entries(allCommits)) {
    if (!visited.has(hash)) {
      visited.add(hash);
      order.push(commit);
    }
  }

  if (order.length === 0) return [];

  // Sort newest first
  order.sort((a, b) => b.timestamp - a.timestamp);

  // Assign lanes: HEAD branch gets lane 0, other branches get lanes 1+
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

  // BFS from each branch to assign lanes
  for (const [branchName, branchHash] of Object.entries(state.branches)) {
    const lane = branchLanes[branchName] ?? 0;
    const branchVisited = new Set<string>();
    const bfsQueue = [branchHash];

    while (bfsQueue.length > 0) {
      const h = bfsQueue.shift()!;
      if (branchVisited.has(h)) continue;
      branchVisited.add(h);

      if (!commitLane.has(h)) {
        commitLane.set(h, lane);
      }

      const c = allCommits[h];
      if (c) {
        for (const ph of c.parentHashes) {
          if (!branchVisited.has(ph)) {
            bfsQueue.push(ph);
          }
        }
      }
    }
  }

  // Handle detached HEAD: BFS from HEAD hash, assign to lane 0 if not already assigned
  if (headHash && state.head.type === 'detached') {
    const detachedVisited = new Set<string>();
    const detachedQueue = [headHash];
    while (detachedQueue.length > 0) {
      const h = detachedQueue.shift()!;
      if (detachedVisited.has(h)) continue;
      detachedVisited.add(h);

      if (!commitLane.has(h)) {
        commitLane.set(h, 0);
      }

      const c = allCommits[h];
      if (c) {
        for (const ph of c.parentHashes) {
          if (!detachedVisited.has(ph)) {
            detachedQueue.push(ph);
          }
        }
      }
    }
  }

  // Assign orphaned commits (not reachable from any branch/HEAD) to a dedicated orphan lane.
  // Use a dashed/dimmed style lane at the far right.
  const orphanLane = nextLane; // one past the last branch lane
  for (const commit of order) {
    if (!commitLane.has(commit.hash)) {
      commitLane.set(commit.hash, orphanLane);
    }
  }

  // Layout constants
  const LANE_WIDTH = 40;
  const ROW_HEIGHT = 56;
  const LEFT_MARGIN = 24;
  const TOP_MARGIN = 30;

  // Determine the highest lane index so we can push text past all rails
  let maxLane = 0;
  for (const lane of commitLane.values()) {
    if (lane > maxLane) maxLane = lane;
  }

  // Text starts after the rightmost rail circle + comfortable gap
  const textStartX = LEFT_MARGIN + maxLane * LANE_WIDTH + 24;

  return order.map((commit, index) => {
    const lane = commitLane.get(commit.hash) ?? 0;
    return {
      commit,
      x: LEFT_MARGIN + lane * LANE_WIDTH,
      y: TOP_MARGIN + index * ROW_HEIGHT,
      lane,
      textX: textStartX,
      isActive: activeSet.has(commit.hash),
    };
  });
}

export function GraphPanel({ state, targetState, startingState, executedCommands }: GraphPanelProps) {
  // Keep a persistent ref of all commits ever seen during this level session.
  // This prevents commits from vanishing when HEAD moves away or branches are deleted.
  const allCommitsRef = useRef<Record<string, Commit>>({});

  // Merge current state's commits into the ever-seen store
  const allCommits = allCommitsRef.current;
  for (const [hash, commit] of Object.entries(state.commits)) {
    if (!allCommits[hash]) {
      allCommits[hash] = commit;
    }
  }

  const activeSet = computeActiveSet(state, allCommits);
  const nodes = layoutGraph(state, allCommits, activeSet);

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-panel-500 font-mono text-sm">
        No commits yet. Try &quot;git add&quot; and &quot;git commit&quot;.
      </div>
    );
  }

  // Build a lookup from hash -> layout info for drawing edges
  const posMap = new Map<string, { x: number; y: number; isActive: boolean }>();
  for (const node of nodes) {
    posMap.set(node.commit.hash, { x: node.x, y: node.y, isActive: node.isActive });
  }

  // Calculate ghost overlay dimensions
  const ghostTargetCount = targetState
    ? targetState.branches.length +
      (targetState.remoteBranches?.length ?? 0) +
      (targetState.workingTreeClean ? 1 : 0) + // working tree row
      1 + // HEAD line
      (targetState.requiredCommands?.length ?? 0) + // required command rows
      (targetState.forbiddenCommands?.length ?? 0) // forbidden command rows
    : 0;
  const ghostRowHeight = targetState?.descriptions ? 38 : 32;
  const ghostHeight = targetState ? ghostTargetCount * ghostRowHeight + 40 : 0;
  const graphBottomY = nodes.length * 56 + 60;

  const svgHeight = graphBottomY + ghostHeight;
  const textStartX = nodes.length > 0 ? nodes[0]!.textX : 48;
  const svgWidth = Math.max(500, textStartX + 420);

  return (
    <div className="flex-1 overflow-auto bg-panel-950 p-2">
      <svg width={svgWidth} height={svgHeight} className="transition-all duration-300">
        {/* SVG glow filter for HEAD node */}
        <defs>
          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges: draw lines from each commit to its parents */}
        {nodes.map((node) =>
          node.commit.parentHashes.map((parentHash) => {
            const parentPos = posMap.get(parentHash);
            if (!parentPos) return null;
            const key = `${node.commit.hash}-${parentHash}`;

            // Edge is "active" only if both endpoints are in the active set
            const edgeActive = node.isActive && parentPos.isActive;
            const edgeOpacity = edgeActive ? 0.6 : 0.15;
            const edgeWidth = edgeActive ? 2 : 1.5;

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
                  strokeWidth={edgeWidth}
                  strokeOpacity={edgeOpacity}
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
                strokeWidth={edgeWidth}
                strokeOpacity={edgeOpacity}
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
            textX={node.textX}
            state={state}
            color={LANE_COLORS[node.lane % LANE_COLORS.length] ?? '#f59e0b'}
            isActive={node.isActive}
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
            executedCommands={executedCommands}
          />
        )}
      </svg>
    </div>
  );
}
