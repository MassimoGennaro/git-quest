# ARCHITECTURE.md — GitQuest Technical Architecture

## 1. Stack

| Layer | Technology |
|---|---|
| Framework | React (with hooks) |
| Graph rendering | SVG (in-browser, no canvas library needed for MVP) |
| Styling | Tailwind CSS |
| State management | React Context + `useReducer` (no Redux for MVP) |
| Persistence | `localStorage` (scores only) |
| Build tool | Vite |
| Testing | Vitest (critical for the simulation engine) |

No backend for MVP. Everything runs in the browser.

---

## 2. Module Map

```
src/
├── engine/               # Git simulation — pure TypeScript, no React
│   ├── types.ts          # Core data types (Commit, RepoState, CommandResult, etc.)
│   ├── store.ts          # The object store (commits, trees, hash generation)
│   ├── refs.ts           # Branch and HEAD management
│   ├── index.ts          # Staging area operations
│   ├── workingTree.ts    # Working tree state
│   ├── mergeUtils.ts     # Shared merge/rebase helpers (ancestor, conflict detection, tree merge)
│   ├── commands/         # One file per implemented command
│   │   ├── add.ts
│   │   ├── branch.ts
│   │   ├── checkout.ts
│   │   ├── cherryPick.ts
│   │   ├── commit.ts
│   │   ├── diff.ts
│   │   ├── log.ts
│   │   ├── merge.ts
│   │   ├── push.ts
│   │   ├── rebase.ts     # Regular + interactive rebase (exports rebaseApply for UI)
│   │   ├── reflog.ts
│   │   ├── reset.ts
│   │   ├── stash.ts
│   │   └── status.ts
│   ├── parser.ts         # Command string → structured command object
│   └── runner.ts         # Dispatch parsed command → correct handler (14 commands)
│
├── levels/               # Data-driven level definitions
│   ├── schema.ts         # TypeScript types for scenario files + Difficulty mapping
│   ├── winCondition.ts   # checkWinCondition(state, target, startingState)
│   ├── index.ts          # Level registry (ALL_LEVELS, loadScenario, getNextLevel)
│   ├── tier1/            # Levels 1-01 through 1-05
│   ├── tier2/            # Levels 2-01 through 2-05
│   ├── tier3/            # Levels 3-01 through 3-05
│   └── tier4/            # Levels 4-01 through 4-05
│
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx        # Levels button, branch indicator, difficulty badge, move counter, undo/retry/hints
│   │   └── AppLayout.tsx     # Main layout, wires all panels + overlays (conflict, rebase, level complete)
│   └── panels/
│       ├── GraphPanel/
│       │   ├── GraphPanel.tsx
│       │   ├── CommitNode.tsx
│       │   └── GhostOverlay.tsx
│       ├── WorkingTreePanel/
│       │   ├── WorkingTreePanel.tsx
│       │   └── FileEntry.tsx
│       ├── SlackPanel/
│       │   ├── SlackPanel.tsx
│       │   └── SlackMessageItem.tsx
│       ├── ConflictPicker/
│       │   └── ConflictPicker.tsx    # Three-panel merge editor
│       ├── LevelComplete/
│       │   └── LevelComplete.tsx     # Score + stars + Level List / Retry / Next Level
│       ├── LevelSelector/
│       │   └── LevelSelector.tsx     # Full-screen level selector with difficulty grouping
│       ├── RebasePicker/
│       │   └── RebasePicker.tsx      # Interactive rebase commit picker (pick/squash/drop)
│       └── Terminal/
│           ├── Terminal.tsx
│           ├── TerminalInput.tsx
│           └── TerminalOutput.tsx
│
├── hooks/
│   ├── useGitEngine.ts   # Engine-to-React bridge (execute, undo, patchState, rebase state, tracking)
│   ├── useLevel.ts       # Loads scenario, checks win condition, triggers messages
│   └── useTerminal.ts    # Input history, keyboard handling
│
├── context/
│   └── GameContext.tsx    # Global game state (view routing, level switching, progress persistence)
│
└── App.tsx               # GameProvider > GameRouter > LevelSelectorView | GameSession
```

---

## 3. Core Data Types

```typescript
// engine/types.ts

/** An immutable commit object in the object store */
export interface Commit {
  hash: string;           // simulated short hash e.g. "a1b2c3f"
  message: string;
  parentHashes: string[]; // 0 for root, 1 for normal, 2 for merge commit
  tree: FileTree;         // snapshot of all tracked files at this commit
  timestamp: number;
}

/** A snapshot of all tracked files */
export type FileTree = Record<string, FileContent>;

export interface FileContent {
  content: string;        // full text content of the file
}

/** The complete simulated repository state */
export interface RepoState {
  // Object store
  commits: Record<string, Commit>;  // hash → commit

  // Refs
  branches: Record<string, string>; // branch name → commit hash
  head: HeadState;

  // Staging area (index)
  index: StagedChanges;             // filename → new content

  // Working tree
  workingTree: WorkingTreeState;

  // Simulated remote
  remote: RemoteState;

  // Stash stack
  stash: StashEntry[];

  // Merge-in-progress parent hash (set during conflicted merge)
  mergeHead?: string;

  // Reflog entries tracking HEAD movements
  reflog: ReflogEntry[];
}

export type HeadState =
  | { type: 'branch'; name: string }       // attached HEAD
  | { type: 'detached'; hash: string };    // detached HEAD

export interface WorkingTreeState {
  files: Record<string, WorkingFile>;
}

export interface WorkingFile {
  status: 'untracked' | 'modified' | 'deleted' | 'conflicted';
  content: string;
  // If conflicted:
  conflictOurs?: string;
  conflictTheirs?: string;
  conflictAncestor?: string;  // common ancestor content, used by three-panel editor
}

export type StagedChanges = Record<string, string>; // filename → content

export interface RemoteState {
  name: string;           // e.g. "origin"
  branches: Record<string, string>; // branch name → commit hash
}

export interface StashEntry {
  index: StagedChanges;
  workingTree: WorkingTreeState;
  message: string;
}
```

---

## 4. The Engine

The engine is the heart of the project. It is **pure TypeScript with zero React dependencies** — this makes it fully unit-testable.

### 4.1 Command Parser

Takes a raw string like `git commit -m "fix auth"` and returns a structured object:

```typescript
export interface ParsedCommand {
  command: string;                   // "commit"
  args: string[];                    // positional args
  flags: Record<string, string | boolean>;  // { m: "fix auth", amend: true }
  raw: string;                       // original input
}

// "git checkout -b feature/login" →
// { command: "checkout", args: ["feature/login"], flags: { b: true }, raw: "..." }
```

Unsupported commands return a `ParseError` with a helpful message.

### 4.2 Command Runner

```typescript
export type CommandResult = {
  success: boolean;
  output: string;          // text to display in terminal
  newState: RepoState;     // the mutated state (or unchanged if error)
  conflictsTriggered?: ConflictSet;  // if a merge produced conflicts
  rebaseInteractive?: RebaseInteractiveInfo;  // signals UI to open interactive rebase picker
};

export function runCommand(
  parsed: ParsedCommand,
  state: RepoState
): CommandResult
```

Each command handler is a pure function: `(args, flags, state) => CommandResult`. This makes commands easy to test in isolation.

### 4.3 Merge Algorithm (Simplified)

Since file content is simulated (not real code), the merge algorithm just needs to detect conflicts, not resolve them. The approach:

1. Find the common ancestor commit of the two branches being merged
2. For each file changed in either branch since the ancestor:
   - Changed in one branch only → auto-merge (take that version)
   - Changed in both branches → conflict (store both versions in `WorkingFile`)
   - Deleted in one, changed in another → conflict
3. Return the new state with conflicted files marked

The actual file content in levels is authored so conflicts are always meaningful and human-readable.

### 4.4 Simulated Hashes

Commit hashes are deterministic fake strings. On each commit:
```
hash = shortHash(message + parentHash + timestamp)
// produces something like "a1b2c3f"
```

They look realistic but are not real SHA1. This is fine — the game teaches concepts not cryptography.

---

## 5. Level Schema

```typescript
// levels/schema.ts

/** Difficulty category, mapped from tier (1=easy, 2=medium, 3=hard, 4=pro) */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'pro';

export const TIER_TO_DIFFICULTY: Record<1 | 2 | 3 | 4, Difficulty>;
export const DIFFICULTY_LABELS: Record<Difficulty, string>;

export interface Scenario {
  id: string;                     // e.g. "tier1-01-first-commit"
  tier: 1 | 2 | 3 | 4;
  title: string;                  // e.g. "First Commit"
  description: string;            // short description shown in level selector
  concepts: string[];             // git concepts/commands this level teaches
  par: number;                    // minimum commands to complete

  startingState: RepoState;       // fully defined initial repo state

  targetState: TargetStateSpec;   // what the engine checks for win

  slackThread: SlackMessage[];    // messages, some with trigger conditions

  hints?: string[];               // optional hints shown on demand
}

export interface TargetStateSpec {
  branches: string[];             // branch names that must exist AND have advanced
  remoteBranches?: string[];      // remote branch names that must exist AND have advanced
  head: HeadState;
  workingTreeClean: boolean;
  requiredCommands?: string[];    // git subcommands the player MUST use to win
  forbiddenCommands?: string[];   // git subcommands the player must NOT use
  descriptions?: TargetDescriptions;  // human-readable labels for ghost overlay
}
// NOTE: Only structural properties are checked. Commit messages are NOT verified.
// "Advanced" means the branch tip hash differs from its starting state hash.
// New branches (not present at start) only need to exist.
// Command tracking stores subcommand names only (e.g., "commit"), not flags.

export type SlackTrigger =
  | { type: 'level_start' }
  | { type: 'after_command'; command: string }
  | { type: 'after_command_without'; command: string; without: string }
  | { type: 'after_branch_created'; name: string }
  | { type: 'after_commit' }
  | { type: 'conflict_triggered' };

export interface SlackMessage {
  from: 'alex' | 'sarah' | 'marcus';
  text: string;
  trigger: SlackTrigger;
  variant?: 'normal' | 'warning';  // warning renders with amber styling
}
```

---

## 6. React Integration

### 6.1 `useGitEngine` Hook

This is the bridge between the pure engine and React. It wraps the engine in React state and provides undo support, command tracking, and conflict state management.

```typescript
export interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

interface EngineSnapshot {
  state: RepoState;
  log: TerminalLine[];
  commandCount: number;
  executedCommands: string[];
  createdBranches: Set<string>;
  commitCount: number;
}

function useGitEngine(initialState: RepoState) {
  // Core state
  const [state, setState] = useState(initialState);
  const [log, setLog] = useState<TerminalLine[]>([]);

  // Command tracking
  const commandCount: number;        // total commands executed
  const executedCommands: string[];   // list of command names (e.g. ["add", "commit"])
  const createdBranches: Set<string>; // branch names created during session
  const commitCount: number;          // number of commits made
  const hasConflicts: boolean;        // true if any file is conflicted

  // Undo support — history stack of EngineSnapshot[]
  const historyRef = useRef<EngineSnapshot[]>([]);
  const canUndo: boolean;

  function execute(input: string): void {
    // 1. Parse command
    // 2. Push current state onto history stack (snapshot)
    // 3. Run command → get CommandResult
    // 4. Update state, log, and tracking counters
  }

  function undo(): void {
    // Pop last snapshot from history, restore all state
  }

  function patchState(newState: RepoState): void {
    // Direct state update (used by conflict resolution — does NOT count as a command)
  }

  function reset(newState: RepoState): void {
    // Full reset: clear state, log, history, and all tracking
  }

  return {
    state, log, execute,
    commandCount, executedCommands, createdBranches, commitCount, hasConflicts,
    reset, patchState, undo, canUndo,
    lastRebaseInteractive, clearRebaseInteractive,
  };
}
```

### 6.2 `useLevel` Hook

Loads the scenario, feeds the initial state to the engine, watches for win, and manages Slack message triggers:

```typescript
function useLevel(scenario: Scenario) {
  const engine = useGitEngine(scenario.startingState);

  // Win condition checks branch existence + advancement + command constraints
  const isWon = checkWinCondition(
    engine.state,
    scenario.targetState,
    scenario.startingState,   // third param: used to detect branch advancement
    engine.executedCommands    // fourth param: checked against required/forbidden commands
  );

  // Trigger Slack messages based on engine state changes
  const visibleMessages = getVisibleMessages(
    scenario.slackThread,
    engine.executedCommands,
    engine.createdBranches,
    engine.commitCount,
    engine.hasConflicts
  );
  // Supports 6 trigger types: level_start, after_command, after_command_without,
  // after_branch_created, after_commit, conflict_triggered.
  // after_command_without fires when command was used but without-command was NOT,
  // enabling self-correcting warning messages.

  // Par-based scoring: 3 stars at/under par, 2 stars par+1-2, 1 star par+3+
  const score = computeScore(engine.commandCount, scenario.par);

  return { engine, scenario, isWon, visibleMessages, score };
}
```

---

## 7. Graph Rendering (SVG)

The graph is rendered as an SVG element inside the center panel. Layout is computed from the `RepoState`:

```
1. Topological sort commits (newest first)
2. Assign each branch a horizontal lane (x position)
3. Assign each commit a vertical position (y)
4. Draw edges (commit → parent) as SVG paths
5. Draw commit circles
6. Draw branch labels
7. Draw HEAD pointer
8. Overlay ghost graph (target state) with 40% opacity + dashed strokes
```

Animation: when state changes, new positions are computed and SVG elements transition with CSS `transition: all 0.3s ease`.

No external graph library for MVP — the git graph topology is simple enough that a custom SVG renderer is ~200 lines and gives full control over the visual style.

---

## 8. Build & File Structure

```
gitquest/
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   └── (as above)
├── docs/
│   ├── README.md
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   └── LEVELS.md
└── tests/
    ├── engine/
    │   ├── helpers.ts             # Shared test utilities
    │   ├── parser.test.ts         # 16 tests
    │   ├── add.test.ts            # 8 tests
    │   ├── commit.test.ts         # 11 tests
    │   ├── status.test.ts         # 12 tests
    │   ├── log.test.ts            # 8 tests
    │   ├── runner.test.ts         # 6 tests
    │   ├── branch.test.ts         # 9 tests
    │   ├── checkout.test.ts       # 9 tests
    │   ├── merge.test.ts          # 12 tests
    │   ├── push.test.ts           # 6 tests
    │   ├── diff.test.ts           # 12 tests
    │   ├── stash.test.ts          # 16 tests
    │   ├── reset.test.ts          # 15 tests
    │   ├── reflog.test.ts         # 5 tests
│   ├── cherryPick.test.ts     # 8 tests
│   └── rebase.test.ts         # 16 tests
└── levels/
    ├── winCondition.test.ts   # 34 tests
    └── useLevel.test.ts       # 20 tests (getVisibleMessages + computeScore)
```

**Total: 223 tests across 18 test files.**

---

## 9. Implementation Order

All 12 steps have been completed for the MVP:

1. ~~**Engine core** — `RepoState` types, `commit`, `add`, `status`, `log` → write tests~~ ✅
2. ~~**Graph renderer** — render a hardcoded state as SVG, no interactivity yet~~ ✅
3. ~~**Terminal component** — input → calls engine → output displayed~~ ✅
4. ~~**Wire them together** — engine state drives graph re-render on each command~~ ✅
5. ~~**Working tree panel** — reads from engine state, no new logic needed~~ ✅
6. ~~**Level loader** — load a scenario file, set initial state, check win condition~~ ✅
7. ~~**Slack panel** — render messages, implement trigger system~~ ✅
8. ~~**Ghost overlay** — render target state as faded layer on graph~~ ✅
9. ~~**Branching commands** — `branch`, `checkout`, `merge` (fast-forward)~~ ✅
10. ~~**Conflict system** — merge conflict detection + three-panel editor~~ ✅
11. ~~**Level complete screen** — score display, next level button~~ ✅
12. ~~**4 complete levels** — one per tier, fully authored~~ ✅

### Post-MVP additions (also complete)
- **Undo last command** — history stack in `useGitEngine`, reverts state/log/tracking
- **Retry level** — bumps `sessionKey` in `GameContext` for full remount
- **Move counter** — `N/par moves` display with color coding in TopBar
- **Three-panel merge editor** — replaced simple A/B picker with ours|result|theirs editor
- **6 new engine commands** — `diff`, `stash`, `reset`, `reflog`, `cherry-pick`, `rebase` (regular + interactive)
- **Shared merge utilities** — `mergeUtils.ts` extracted from merge.ts, reused by cherry-pick and rebase
- **20 levels across 4 tiers** — 5 per tier (Easy, Medium, Hard, Pro), each teaching one git concept
- **Full-screen level selector** — difficulty grouping, star display, best move tracking
- **Interactive rebase picker UI** — pick/squash/drop cycling with modal overlay
- **Enhanced progress persistence** — `localStorage` stores stars AND best move count per level
- **View routing** — App.tsx routes between LevelSelector and GameSession views
- **Difficulty system** — Tier → Difficulty mapping (Easy/Medium/Hard/Pro) with color-coded badges
