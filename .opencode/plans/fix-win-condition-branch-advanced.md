# Fix Win Condition: Branch Must Have Advanced

## Problem

After removing commit message checking from win conditions, branches that already exist at level start (like `main` and `origin/main` in Level 1-01) immediately show as "satisfied" because the win condition only checks branch **existence**. The level complete overlay appears immediately on load.

## Solution

Compare branch tip hashes against the starting state. For each target branch:
- If the branch existed in `startingState`, require its current tip hash **differs** from the starting tip hash (i.e., the player made a commit/push that advanced it)
- If the branch didn't exist at start, just require it exists now (player created it)

## Changes

### 1. `src/levels/winCondition.ts`

Add `startingState: RepoState` as a third parameter to `checkWinCondition`.

**`checkBranches`** — gains `startingState` param:
```ts
function checkBranches(state: RepoState, target: TargetStateSpec, startingState: RepoState): boolean {
  for (const branchName of target.branches) {
    if (!state.branches[branchName]) return false;
    // If branch existed at start, it must have advanced
    const startHash = startingState.branches[branchName];
    if (startHash && state.branches[branchName] === startHash) return false;
  }
  return true;
}
```

**`checkRemoteBranches`** — same pattern:
```ts
function checkRemoteBranches(state: RepoState, target: TargetStateSpec, startingState: RepoState): boolean {
  if (!target.remoteBranches) return true;
  for (const branchName of target.remoteBranches) {
    if (!state.remote.branches[branchName]) return false;
    const startHash = startingState.remote.branches[branchName];
    if (startHash && state.remote.branches[branchName] === startHash) return false;
  }
  return true;
}
```

`checkHead` and `checkWorkingTree` remain unchanged.

### 2. `src/hooks/useLevel.ts`

Pass `scenario.startingState` to `checkWinCondition`:
```ts
const isWon = useMemo(
  () => checkWinCondition(engine.state, scenario.targetState, scenario.startingState),
  [engine.state, scenario.targetState, scenario.startingState],
);
```

### 3. `src/components/panels/GraphPanel/GhostOverlay.tsx`

Add `startingState: RepoState` to props interface.

Update `isSatisfied` logic for branches:
```ts
isSatisfied: !!state.branches[branchName] &&
  (!startingState.branches[branchName] || state.branches[branchName] !== startingState.branches[branchName])
```

Same for remote branches:
```ts
isSatisfied: !!state.remote.branches[branchName] &&
  (!startingState.remote.branches[branchName] || state.remote.branches[branchName] !== startingState.remote.branches[branchName])
```

### 4. `src/components/panels/GraphPanel/GraphPanel.tsx`

Add `startingState?: RepoState` to `GraphPanelProps`. Pass it to `GhostOverlay`:
```tsx
<GhostOverlay
  target={targetState}
  state={state}
  startingState={startingState}  // new
  yOffset={graphBottomY}
  xOffset={30}
/>
```

### 5. `src/components/layout/AppLayout.tsx`

Pass starting state through to GraphPanel:
```tsx
<GraphPanel state={state} targetState={scenario.targetState} startingState={scenario.startingState} />
```

### 6. `tests/levels/winCondition.test.ts`

- Add a `makeStartingState()` helper (or reuse `makeState()`) for the starting state argument
- Update ALL existing `checkWinCondition` calls to pass a third `startingState` argument
- Add new test cases:
  - `"should fail when branch exists but hasn't advanced from starting state"` — same hash as start
  - `"should pass when branch has advanced from starting state"` — different hash
  - `"should pass when branch didn't exist at start and now exists"` — new branch
  - `"should fail when remote branch exists but hasn't advanced from starting state"`
  - `"should pass when remote branch has advanced from starting state"`
  - Update combined "level 1-01" test to pass proper starting state where `main` starts at `initialHash`

## Files NOT Changed

- `src/levels/schema.ts` — `TargetStateSpec` stays as `branches: string[]`
- All level files (`tier1/level-1-01.ts`, `tier2/level-2-03.ts`, `tier3/level-3-01.ts`, `tier4/level-4-01.ts`) — no changes needed
- Engine files — no changes needed

## Verification

After implementation, run `npx vitest run` — all tests (currently 116 + new ones) should pass. The build (`npm run build`) should also succeed with no type errors.
