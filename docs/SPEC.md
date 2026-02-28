# SPEC.md — GitQuest Product Specification

## 1. Concept

GitQuest is a browser-based puzzle game where players learn git by doing. Each level presents a fictional codebase scenario communicated through a Slack-style chat panel. The player must execute git commands in an embedded terminal to transform the repository from its starting state into a defined target state.

The git graph is the game board. Commands cause it to animate in real time. Winning means making the graph match the target.

---

## 2. Core Game Loop

```
1. Level loads → starting git state initialised
2. Slack thread visible → player reads the task
3. Player types git commands in terminal
4. Each command mutates the sim state → graph animates
5. After each command, win condition is checked
6. Target reached → level complete screen (score, par, next level)
```

---

## 3. UI Layout

```
┌─────────────────────────────────────────────────────┐
│  ⎇ feature/login    GitQuest    Level 3 · "Hotfix"  │  ← top bar
├────────────────┬────────────────────────────────────┤
│                │                                     │
│  WORKING TREE  │           GIT GRAPH                 │
│                │                                     │
│  Staged        │   ●  a1b2c3  (HEAD → main)          │
│  ──────────    │   │                                 │
│  > auth.js     │   ●  9f8e7d  feat: add login        │
│                │   │╲                                │
│  Modified      │   │  ●  3c4d5e  (feature/auth)      │
│  ──────────    │   │  │                              │
│  > config.js   │   ●  2a1b0c  initial commit         │
│                │                                     │
│  Untracked     │  [ghost overlay = target state]     │
│  ──────────    │                                     │
│  > notes.txt   │                                     │
│                │                                     │
├────────────────┴────────────────────────────────────┤
│ 💬 Sarah  "hey, can you merge feature/auth into     │  ← slack panel
│           develop? heads up there's a conflict      │    (collapsible)
│           in config.js"                             │
├─────────────────────────────────────────────────────┤
│  $ git _                                            │  ← terminal
└─────────────────────────────────────────────────────┘
```

### 3.1 Top Bar
- **Levels button:** navigates back to the full-screen level selector
- Current branch indicator (updates live) — shows branch name or `detached @ <hash>`
- **Difficulty badge:** color-coded label (Easy=green, Medium=blue, Hard=orange, Pro=red)
- Game title, level name, and par value
- **Move counter:** displays `N/par moves` with color coding (green at/under par, yellow par+1–2, red beyond par+2)
- **Undo button:** reverts the last command (disabled when no history)
- **Retry button:** restarts the level from scratch
- **Hints button:** toggles an expandable hints panel (only shown if the level has hints)

### 3.2 Working Tree Panel (left)
Three sections, each listing filenames:
- **Staged** — files in the index, ready to commit
- **Modified** — tracked files with unstaged changes
- **Untracked** — new files not yet added

Clicking a filename shows a simplified diff view inline.  
Files animate (highlight) when they transition between states after a command.

### 3.3 Git Graph Panel (center)
- Vertical layout (top = newest, like `git log --graph`)
- Each commit is a circle node with: short hash, commit message, branch label if applicable
- Branches rendered as colored lanes
- HEAD shown as a distinct pointer label
- **Ghost overlay**: a faded/dashed version of the target graph sits alongside the real one. As the player progresses, the real graph converges toward the ghost.
- Clicking a commit node expands it to show full message and changed files.
- Graph animates on every state change (new node appears, branch label moves, etc.)

### 3.4 Slack Panel (collapsible)
- Rendered as a minimal Slack-like chat UI
- Shows a fictional team channel (e.g. `#dev-team`)
- Messages appear at level start; some are triggered by player actions mid-level
- Characters have names, avatars (initials + color), and consistent personalities
- Panel can be collapsed to a single-line summary to give more graph space

### 3.5 Terminal
- Always visible at the bottom
- Single input line: `$ git _`
- Only `git` commands accepted (typing anything else returns a friendly error)
- Command history navigable with ↑ / ↓
- Output displayed above the input line (scrollable), mimicking real terminal output
- Supports tab-completion for branch names and filenames (planned, not yet implemented)

---

## 4. Scoring

Each level has a defined **par** — the minimum number of commands a competent developer would need. The player's score is based on how close they get to par.

| Commands used | Score |
|---|---|
| = par | ⭐⭐⭐ |
| par + 1–2 | ⭐⭐ |
| par + 3+ | ⭐ |

Score is stored in `localStorage` for MVP. Designed to plug into a remote leaderboard in v1.

---

## 5. Difficulty Tiers

### Tier 1 — Basics
**Operations introduced:** `status`, `add`, `commit`, `push`  
**Conflict resolution:** none  
**Slack guidance:** explicit step-by-step  
**Sample task:** "commit your changes to feature/login and push it up"

### Tier 2 — Branching
**Operations introduced:** `branch`, `checkout`, `merge` (fast-forward only), `pull`  
**Conflict resolution:** none  
**Slack guidance:** describes the goal, not the steps  
**Sample task:** "create a branch off develop, do the work, merge it back"

### Tier 3 — Conflicts & Recovery
**Operations introduced:** `merge` (with conflicts), `stash`, `commit --amend`, `reset HEAD <file>`, `diff`, `reset --soft/--mixed`  
**Conflict resolution:** Three-panel merge editor, answer telegraphed in Slack  
**Slack guidance:** hints at what to keep, not how  
**Sample task:** "merge feature/auth into develop — there's a conflict in config.js, keep Sarah's version of the timeout"

### Tier 4 — Advanced
**Operations introduced:** `rebase`, `rebase -i` (interactive), `cherry-pick`, `reset --hard/--soft`, `reflog`  
**Conflict resolution:** Three-panel merge editor with no Slack hint  
**Slack guidance:** describes outcome only ("make the history clean before the PR")  
**Sample task:** "squash the last 3 commits and rebase onto main before opening the PR"

---

## 6. Conflict Resolution UX

When a merge conflict is triggered, the working tree panel highlights the conflicting file(s) in red. The player must resolve each conflict before they can complete the merge.

### UI: Three-Panel Merge Editor

The conflict editor is a full-screen modal overlay inspired by VS Code / JetBrains merge editors:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Conflict in config.js                                               │
├────────────────────┬──────────────────────┬─────────────────────────┤
│  Current (Ours)    │      Result          │  Incoming (Theirs)      │
│  ─────────────     │      ──────          │  ─────────────────      │
│                    │                      │                         │
│  timeout: 5000     │  [editable textarea] │  timeout: 3000          │
│  (read-only)       │                      │  (read-only)            │
│  blue diff hl      │                      │  green diff hl          │
│                    │                      │                         │
├────────────────────┴──────────────────────┴─────────────────────────┤
│  [ Accept Current ]  [ Accept Incoming ]  [ Apply Resolution ]       │
│                                                                      │
│  ■ Blue = changed from ancestor (ours)                               │
│  ■ Green = changed from ancestor (theirs)                            │
└──────────────────────────────────────────────────────────────────────┘
```

- **Left panel (Current / Ours):** Read-only. Shows the current branch's version with line-level diff highlights (blue) against the common ancestor.
- **Center panel (Result):** Editable textarea initialized to the ancestor content. The player can edit freely or use the quick actions.
- **Right panel (Incoming / Theirs):** Read-only. Shows the incoming branch's version with line-level diff highlights (green) against the common ancestor.
- **Accept Current:** Fills the result textarea with the "ours" content.
- **Accept Incoming:** Fills the result textarea with the "theirs" content.
- **Apply Resolution:** Confirms the resolution — the file moves from `conflicted` to `modified` in the working tree. The player must then `git add <file>` and `git commit` to complete the merge.
- **Conflict resolution does not count as a command** — it uses `patchState()` rather than the command execution pipeline.

### Progressive Guidance
- **Tier 3 early levels:** Slack message explicitly says which version to keep
- **Tier 3 late levels:** Slack message describes the intent ("the new timeout was a mistake"), player infers which to keep
- **Tier 4:** No guidance; player reads both diffs and decides

---

## 7. Characters

Characters send messages and have consistent personalities that signal task type and difficulty.

| Character | Personality | Signals |
|---|---|---|
| **Alex** | Casual, brief, uses emoji | Simple tasks, fast-forward merges, "just push it" energy |
| **Sarah** | Thorough, context-rich, cautious | Conflict warnings, "make sure you squash before the PR" |
| **Marcus** | Terse, senior, expects you to know | Tier 4 tasks, no hand-holding |

---

## 8. Win Condition

A level is won when **all** checks pass:

1. **Branch existence** — all target branches (local and remote) exist
2. **Branch advancement** — each target branch that existed at level start must have a different tip hash than it started with (i.e., the player did work on it). New branches just need to exist.
3. **HEAD position** — HEAD matches the target (attached to the right branch, or detached at the right commit)
4. **Working tree clean** — no staged, modified, or untracked files (unless the scenario explicitly allows them)

**Commit messages are NOT checked.** The win condition verifies structural properties only — branch names, advancement from starting state, HEAD, and working tree cleanliness. This allows players creative freedom in their commit messages.

The ghost overlay in the graph provides a continuous visual indication of how close the player is. Branch labels in the ghost show checkmarks when the corresponding branch has advanced from its starting state.

---

## 9. MVP Scope (Implemented)

### Included
- 20 levels across 4 tiers (5 per tier: Easy, Medium, Hard, Pro)
- Full-screen level selector with difficulty grouping, star display, and best move tracking
- SVG graph renderer with ghost overlay
- Working tree panel (staged / modified / untracked / conflicted)
- Slack panel with triggered messages (5 trigger types)
- Terminal with command history (↑/↓)
- Simulation engine: 14 git commands — `add`, `branch`, `checkout`, `cherry-pick`, `commit`, `diff`, `log`, `merge`, `push`, `rebase` (regular + interactive), `reflog`, `reset`, `stash`, `status`
- Interactive rebase picker UI (pick / squash / drop)
- Three-panel merge conflict editor (ours | result | theirs, with free-form editing)
- Local progress storage (`localStorage`) — stars and best move count per level
- Undo last command + retry level
- Move counter with par-based color coding
- Level complete screen with star rating + Level List / Retry / Next Level buttons

### Explicitly Out of Scope for MVP
- GitHub auth
- Leaderboard
- Tab completion for branch names / filenames
- `git bisect`
- Mobile layout
- Community-authored levels

---

## 10. Resolved Design Questions

These were open at design time and have been resolved during implementation:

- **Commit hash display:** Uses realistic-looking fake hashes (e.g. `a1b2c3f`) generated by `generateHash()` — a deterministic short hash function. This teaches transferable hash recognition.
- **Push/pull simulation:** The "remote" is a second internal `RemoteState` object (`{ name: "origin", branches: Record<string, string> }`). `git push` syncs local branch tips to the remote. `git fetch`/`git pull` are not yet implemented.
- **Tab completion scope:** Not yet implemented in MVP. Terminal supports command history (↑/↓) only.
