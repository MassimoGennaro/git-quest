# Contributing to GitQuest

Thank you for your interest in contributing to GitQuest! This document covers everything you need to get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Architecture](#project-architecture)
- [Code Style](#code-style)
- [Testing](#testing)
- [Authoring New Levels](#authoring-new-levels)
- [Implementing New Git Commands](#implementing-new-git-commands)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Issue Guidelines](#issue-guidelines)

---

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- npm 11+

### Setup

```bash
git clone https://github.com/<your-org>/git-quest.git
cd git-quest
npm install
npm run dev          # Start dev server at http://localhost:5173
npm test             # Run tests in watch mode
```

### Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc && vite build` -- typecheck + production build |
| `npm test` | Vitest in watch mode |
| `npx vitest run` | Run all tests once (CI mode) |
| `npm run lint` | ESLint |

---

## Development Workflow

1. **Fork** the repository and clone your fork.
2. **Create a branch** off `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
   Use prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`.
3. **Make your changes.** Write tests for any engine or level logic.
4. **Run the checks** before pushing:
   ```bash
   npm run build     # Must pass -- catches type errors
   npx vitest run    # All tests must pass
   npm run lint      # No lint errors
   ```
5. **Push** and open a Pull Request against `main`.

---

## Project Architecture

Read these docs to understand the codebase:

| Document | What it covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Module map, data types, engine design, hooks, implementation order |
| [docs/SPEC.md](docs/SPEC.md) | Product spec, UI layout, scoring, win conditions, conflict UX |
| [docs/LEVELS.md](docs/LEVELS.md) | Level design guide, example levels, progression map |

### Key Architectural Rules

- **The engine (`src/engine/`) is pure TypeScript with zero React imports.** This is the most important rule. Every command handler is a pure function: `(args, flags, state) => CommandResult`. No `useState`, no `useEffect`, no React anywhere in `src/engine/`.
- **State is immutable.** Command handlers return a new `RepoState` -- never mutate the input.
- **No external graph libraries.** The SVG graph renderer is custom (~200 lines).
- **No `any`.** Use `unknown` + type guards. `strict: true` is enforced.

### Directory Overview

```
src/engine/          # Pure TypeScript git simulation (testable without React)
src/levels/          # Level definitions, schema, win condition checker
src/components/      # React components (layout + panels)
src/hooks/           # React hooks bridging engine to UI
src/context/         # GameContext (global state)
tests/               # Mirrors src/ structure
```

---

## Code Style

### TypeScript

- `strict: true` in tsconfig -- no exceptions.
- Never use `any`. Use `unknown` with type guards or proper generics.
- Prefer `interface` for object shapes, `type` for unions and aliases.
- Use discriminated unions for state variants (e.g., `HeadState`).
- Use early returns for error cases.

### Naming

| Thing | Convention | Example |
|---|---|---|
| Files (modules) | camelCase | `workingTree.ts` |
| Files (React) | PascalCase | `GraphPanel.tsx` |
| Variables, functions | camelCase | `parseCommand` |
| Types, interfaces | PascalCase | `RepoState` |
| Constants | UPPER_SNAKE_CASE | Only for true global constants |
| Test files | `<name>.test.ts` | `commit.test.ts` |

### Imports

- **Named exports only** -- no default exports.
- Group imports: (1) external packages, (2) `@/` internal aliases, (3) relative paths.
- Separate groups with a blank line.
- Use the `@/` path alias (mapped to `src/`).

### React

- Functional components with hooks only. No class components.
- Tailwind CSS utility classes on JSX elements. No CSS modules, no styled-components.
- One component per file. Filename matches component name.
- Use `useReducer` for complex state, `useState` for simple toggles.

---

## Testing

### Philosophy

Engine tests are the highest priority. The engine is the core of the game -- if a git command behaves incorrectly, the game breaks.

### Running Tests

```bash
npm test                                        # Watch mode
npx vitest run                                  # All tests, once
npx vitest run src/engine/commands/commit.test.ts  # Single file
npx vitest run -t "should create a merge commit"   # Single test by name
npx vitest run tests/engine/                       # Directory
```

### Writing Engine Tests

Engine tests are straightforward: build a `RepoState`, run a command, assert the new state and output.

```typescript
import { describe, it, expect } from 'vitest';
import { runCommand } from '@/engine/runner';
import { parseCommand } from '@/engine/parser';

describe('git add', () => {
  it('should stage an untracked file', () => {
    const state = createTestState({
      workingTree: {
        files: {
          'README.md': { status: 'untracked', content: '# Hello' },
        },
      },
    });

    const parsed = parseCommand('git add README.md');
    if (!parsed.success) throw new Error('Parse failed');
    const result = runCommand(parsed.parsed, state);

    expect(result.success).toBe(true);
    expect(result.newState.index['README.md']).toBe('# Hello');
  });
});
```

### What to Test

- **Happy path:** Command succeeds, state and output are correct.
- **Error cases:** Invalid args, wrong state (e.g., nothing staged for commit).
- **Edge cases:** Empty repos, detached HEAD, conflicted files, staging deletions.
- **Win conditions:** Given a scenario, verify `checkWinCondition` returns the expected result.

### Test Utilities

Shared helpers live in `tests/engine/helpers.ts`. Use them to build test states without boilerplate.

---

## Authoring New Levels

Adding a new level is one of the best ways to contribute. See [docs/LEVELS.md](docs/LEVELS.md) for the full design guide.

### Quick Summary

1. Create a new file in `src/levels/tierN/level-N-NN.ts`.
2. Export a `Scenario` object matching the schema in `src/levels/schema.ts`.
3. Register it in `src/levels/index.ts`.
4. Write a win condition test in `tests/levels/`.

### Key Rules

- **One new concept per level.** Never introduce two new commands in the same level.
- **Par is the minimum for someone who knows git** -- not generous.
- **Target state uses `branches: string[]`** -- just branch names. Commit messages are NOT checked by the win condition.
- **Slack messages use character personalities:** Alex (casual), Sarah (thorough), Marcus (terse).
- **Starting states should feel lived-in** -- realistic branch names and commit histories.
- **Use command constraints to prevent cheating.** If a level teaches a specific command (e.g., `cherry-pick`), add `requiredCommands` and/or `forbiddenCommands` to ensure the player uses the intended approach.
- **Add warning Slack messages for constrained levels.** Players who use a forbidden or wrong approach should get an in-character nudge in the Slack panel.

### Level File Template

```typescript
import { Scenario } from '../schema';
import { RepoState } from '@/engine/types';

const startingState: RepoState = {
  commits: { /* ... */ },
  branches: { /* ... */ },
  head: { type: 'branch', name: 'main' },
  index: {},
  workingTree: { files: { /* ... */ } },
  remote: { name: 'origin', branches: { /* ... */ } },
  stash: [],
};

export const level: Scenario = {
  id: 'tierN-NN-level-name',
  tier: 1,          // 1-4
  title: 'Level Name',
  par: 3,

  startingState,

  targetState: {
    branches: ['main'],
    // remoteBranches: ['main'],  // optional
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
    // requiredCommands: ['cherry-pick'],  // player MUST use these
    // forbiddenCommands: ['merge'],       // player must NOT use these
    // descriptions: {                     // shown in ghost overlay
    //   branches: { main: 'cherry-picked fix applied' },
    //   requiredCommands: { 'cherry-pick': 'apply a single commit' },
    //   forbiddenCommands: { merge: 'do NOT merge the whole branch' },
    // },
  },

  slackThread: [
    {
      from: 'alex',
      trigger: { type: 'level_start' },
      text: 'hey! ...',
    },
    // Warning when player uses wrong approach (forbidden command):
    // {
    //   from: 'sarah',
    //   trigger: { type: 'after_command', command: 'merge' },
    //   text: 'hold on — you merged the whole branch...',
    //   variant: 'warning',
    // },
    // Warning when player goes off-track (missing required command):
    // {
    //   from: 'sarah',
    //   trigger: { type: 'after_command_without', command: 'add', without: 'stash' },
    //   text: 'you should stash first...',
    //   variant: 'warning',
    // },
  ],

  hints: [
    'Try git add first',
    'Then git commit -m "your message"',
  ],
};
```

### Command Constraints

Levels that teach a specific git command should use `requiredCommands` and/or `forbiddenCommands` in `targetState` to prevent players from bypassing the intended approach:

- **`requiredCommands: string[]`** — Git subcommand names that MUST appear in the player's command history to win. Example: `['cherry-pick']` requires the player to have used `git cherry-pick` at least once.
- **`forbiddenCommands: string[]`** — Git subcommand names that must NOT appear in the player's command history. Example: `['merge']` blocks winning if the player used `git merge`.
- **`descriptions.requiredCommands`** and **`descriptions.forbiddenCommands`** — Human-readable descriptions shown in the ghost overlay so the player knows what's expected. Key is the command name, value is a short explanation.

Command names are the git subcommand only (e.g., `'commit'`, `'stash'`, `'rebase'`), NOT including flags. `git commit --amend` is tracked as `'commit'`, so flag-level distinctions cannot be enforced.

### Warning Slack Messages

When a level has command constraints, add Slack messages with `variant: 'warning'` to nudge the player back on track. Warning messages render with an amber left border and tinted background, visually distinct from normal messages.

**Two patterns:**

1. **Forbidden command warning** — Fires when the player uses a forbidden command. Use `after_command` trigger:
   ```typescript
   {
     from: 'sarah',
     trigger: { type: 'after_command', command: 'merge' },
     text: 'hold on — you merged the whole branch. use cherry-pick instead.',
     variant: 'warning',
   }
   ```

2. **Missing required command nudge** — Fires when the player uses command X but hasn't used required command Y yet. Use `after_command_without` trigger:
   ```typescript
   {
     from: 'sarah',
     trigger: { type: 'after_command_without', command: 'add', without: 'stash' },
     text: 'you should stash your changes first before switching branches.',
     variant: 'warning',
   }
   ```
   This message automatically disappears once the player uses `stash` (the `without` command), so it's self-correcting.

**Guidelines for warning messages:**
- Stay in character — Alex is casual, Sarah is thorough, Marcus is terse
- Be specific about what went wrong AND what to do instead
- Don't repeat the level instructions verbatim — add context the player wouldn't get elsewhere
- One warning per constraint is sufficient; don't overwhelm with multiple warnings

---

## Implementing New Git Commands

The next commands to implement (in rough priority order):

1. `git stash` / `git stash pop`
2. `git reset` (with `--soft`, `--hard`, `HEAD <file>` variants)
3. `git pull` (fetch + merge from remote)
4. `git rebase` (including `-i` for interactive)
5. `git cherry-pick`
6. `git diff`
7. `git commit --amend`

### How to Add a Command

1. **Create `src/engine/commands/<command>.ts`** exporting a `CommandHandler`:
   ```typescript
   import { CommandHandler } from '@/engine/types';

   export const handleMyCommand: CommandHandler = (args, flags, state) => {
     // Validate args/flags
     // Compute new state (immutably!)
     // Return { success, output, newState }
   };
   ```
2. **Register it** in `src/engine/runner.ts` in the `handlers` map.
3. **Write thorough tests** in `tests/engine/<command>.test.ts`.
4. **Update `docs/SPEC.md`** section 5 (Difficulty Tiers) if the command unlocks new level types.

### Rules for Command Handlers

- Pure function: `(args, flags, state) => CommandResult`.
- Never mutate `state` -- always return a new object.
- Never throw -- return `{ success: false, output: "error message", newState: state }`.
- Never import from React.

---

## Pull Request Guidelines

### Before Submitting

- [ ] `npm run build` passes (typecheck + build)
- [ ] `npx vitest run` passes (all tests)
- [ ] `npm run lint` passes (no errors)
- [ ] New engine logic has tests
- [ ] New levels have win condition tests
- [ ] Docs updated if behavior changed

### PR Format

- **Title:** Use a conventional prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Description:** Explain what changed and why. Link to any related issue.
- **Keep PRs focused.** One feature or fix per PR. If a PR touches the engine AND adds a level, split it.

### Review Process

- At least one maintainer review is required.
- CI must pass (build + tests + lint).
- Merge via squash commit to keep history clean.

---

## Issue Guidelines

### Bug Reports

Use the **Bug Report** template. Include:
- Steps to reproduce (which level, which commands)
- Expected behavior vs. actual behavior
- Browser and OS

### Feature Requests

Use the **Feature Request** template. Describe:
- What you want and why
- How it fits into the existing game structure
- Whether you'd be willing to implement it

### Good First Issues

Issues labeled `good first issue` are specifically chosen for new contributors. These typically include:
- Adding a new level
- Adding tests for edge cases
- Small UI improvements
- Documentation improvements

---

## Questions?

Open a [Discussion](https://github.com/<your-org>/git-quest/discussions) or comment on a relevant issue. We're happy to help.
