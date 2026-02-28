# AGENTS.md — Coding Agent Instructions for GitQuest

## Project Overview

GitQuest is a browser-based educational puzzle game for learning git. Players type
real git commands in a simulated terminal to transform a repository from a starting
state into a target state. Pure frontend — no backend for MVP.

## Stack

- **Language:** TypeScript (strict mode)
- **Framework:** React 18+ with hooks (no class components)
- **Styling:** Tailwind CSS (utility-first, no custom CSS unless unavoidable)
- **State:** React Context + `useReducer` (no Redux)
- **Build:** Vite
- **Testing:** Vitest
- **Graph rendering:** Custom SVG (no external graph libraries)
- **Persistence:** `localStorage` (scores only)

## Build & Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build (runs tsc && vite build)
npm run preview      # Preview production build locally
```

## Test Commands

```bash
npm test             # Run all tests via Vitest
npx vitest run       # Run all tests once (no watch)
npx vitest run src/engine/commands/commit.test.ts   # Run a single test file
npx vitest run -t "should create a merge commit"    # Run a single test by name
npx vitest run src/engine/                          # Run all tests in a directory
```

## Lint & Format

If ESLint/Prettier are configured:
```bash
npm run lint         # Run ESLint
npm run lint -- --fix  # Auto-fix lint issues
npm run format       # Run Prettier (if configured)
```

## Project Structure

```
src/
├── engine/              # Git simulation — pure TypeScript, ZERO React imports
│   ├── types.ts         # Core data types (Commit, RepoState, FileTree, etc.)
│   ├── store.ts         # Object store (commits, trees)
│   ├── refs.ts          # Branch and HEAD management
│   ├── index.ts         # Staging area operations
│   ├── workingTree.ts   # Working tree state
│   ├── parser.ts        # Command string → ParsedCommand object
│   ├── runner.ts        # Dispatch parsed command → handler → CommandResult
│   └── commands/        # One file per git command (add.ts, commit.ts, merge.ts, etc.)
├── levels/              # Data-driven level definitions
│   ├── schema.ts        # TypeScript types for Scenario, TargetStateSpec, etc.
│   ├── tier1/           # Levels 1-01 through 1-05
│   ├── tier2/           # Levels 2-01 through 2-05
│   ├── tier3/           # Levels 3-01 through 3-05
│   └── tier4/           # Levels 4-01 through 4-05
├── components/
│   ├── layout/          # TopBar.tsx, AppLayout.tsx
│   └── panels/          # GraphPanel/, WorkingTreePanel/, SlackPanel/, Terminal/
├── hooks/               # useGitEngine.ts, useLevel.ts, useTerminal.ts
└── context/             # GameContext.tsx — global game state
tests/
├── engine/              # Unit tests for simulation engine
└── levels/              # Win condition tests
```

## Code Style Guidelines

### TypeScript

- Enable `strict: true` in tsconfig. Never use `any` — use `unknown` + type guards.
- Prefer `interface` for object shapes, `type` for unions and aliases.
- Export types alongside their implementations. Co-locate types with the code that uses them.
- Use discriminated unions for state variants (see `HeadState` in `engine/types.ts`).

### Naming Conventions

- **Files:** camelCase for modules (`workingTree.ts`), PascalCase for React components (`GraphPanel.tsx`).
- **Directories:** camelCase (`commands/`, `panels/`).
- **Variables/functions:** camelCase (`parseCommand`, `runCommand`).
- **Types/Interfaces:** PascalCase (`RepoState`, `ParsedCommand`, `CommandResult`).
- **Constants:** UPPER_SNAKE_CASE only for true global constants. Prefer `const` at module scope.
- **React components:** PascalCase, one component per file, filename matches component name.
- **Test files:** co-locate with source as `<name>.test.ts` or place in `tests/` mirroring `src/`.

### Imports

- Use named exports (not default exports) for all modules.
- Group imports: (1) external packages, (2) internal absolute paths, (3) relative paths.
- Separate groups with a blank line.
- Use path aliases if configured in tsconfig (e.g., `@/engine/types`).

### Functions & Architecture

- **Engine code must be pure TypeScript with zero React dependencies.** This is critical.
  Every command handler is a pure function: `(args, flags, state) => CommandResult`.
- Keep functions small and pure. Side effects belong at the boundary (hooks, context).
- Command handlers must never mutate `RepoState` — always return a new state object.
- Use early returns for error cases.

### React Components

- Use functional components with hooks exclusively. No class components.
- Keep components small. Extract logic into custom hooks.
- Use `useReducer` for complex state, `useState` for simple toggles/inputs.
- Tailwind classes directly on JSX elements. No CSS modules or styled-components.
- SVG rendering is custom — no D3, no external graph libraries.

### Error Handling

- Command parser returns a `ParseError` with a user-friendly message for unsupported commands.
- Command runner returns `CommandResult` with `success: boolean` and `output: string`.
- Never throw from engine code — always return error states in the result type.
- React error boundaries for component-level failures.
- Provide helpful terminal output for invalid commands (e.g., "Unknown command: git foo. Try 'git status'.").

### Testing

- **Engine tests are the highest priority.** Every command handler needs thorough unit tests.
- Test pure functions directly — no React rendering needed for engine tests.
- Test the command → state transformation: given a `RepoState` and a command string,
  assert the resulting `RepoState` and terminal output.
- Test edge cases: conflicting merges, detached HEAD, empty staging area, etc.
- Level win-condition tests: given a scenario, verify the target state checker works correctly.
- Use descriptive test names: `"commit with -m flag should create commit with message"`.

### Level Authoring

- Each level is a `.ts` file exporting a `Scenario` object matching the schema.
- One new git concept per level. Never introduce two new commands in the same level.
- `par` is the minimum commands a competent developer needs — not generous.
- Starting states should feel "lived-in" with realistic commit histories.
- Slack messages use character personalities: Alex (casual), Sarah (thorough), Marcus (terse).
- Target state is defined by branch names → commit messages (not hashes).

### Git Simulation Details

- Commit hashes are deterministic fakes: `shortHash(message + parentHash + timestamp)`.
- The "remote" is a second internal `RemoteState` object — no real network calls.
- Merge algorithm: find common ancestor, detect file-level conflicts, mark `conflicted` files.
- Conflict resolution uses A/B picker (Keep Ours / Keep Theirs) — no manual editing in MVP.

## Key Design Decisions

- No external dependencies for graph rendering — custom SVG keeps bundle small and gives
  full visual control (~200 lines of rendering code).
- Engine is decoupled from React so it can be tested without jsdom/rendering overhead.
- State is immutable — every command returns a new `RepoState`, never mutates in place.
- Levels are data-driven TypeScript files, not JSON, to get type checking on scenario definitions.

## Implementation Priority

Build in this order to reach a playable prototype fastest:
1. Engine core (types, `add`, `commit`, `status`, `log`) + tests
2. Graph renderer (hardcoded state → SVG)
3. Terminal component (input → engine → output)
4. Wire engine to graph (re-render on each command)
5. Working tree panel
6. Level loader + win condition checker
7. Slack panel + trigger system
8. Ghost overlay (target state visualization)
9. Branching commands (`branch`, `checkout`, `merge`)
10. Conflict system (detection + picker UI)
11. Level complete screen + scoring
12. Author 4 complete levels (one per tier)
