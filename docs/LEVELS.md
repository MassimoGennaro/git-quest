# LEVELS.md — Level Design Guide & Example Scenarios

## 1. Design Principles

- **Every level teaches exactly one new concept.** Don't introduce `rebase` and `cherry-pick` in the same level.
- **The Slack thread tells a story, not a tutorial.** Characters speak like real developers ("can you squash those before the PR?"), not documentation ("use git squash to combine commits").
- **The starting state should feel lived-in.** Real commit histories are messy. Don't start from a single clean commit unless the level is Tier 1.
- **Par should be achievable by someone who knows git, not generous.** If the ideal solution is 4 commands, par is 4.
- **Ghost overlay should be obviously different from the starting state** — the visual delta gives the player orientation.

---

## 2. Authoring a Level

Each level is a TypeScript file in `src/levels/tierN/`. Copy the template below.

### Starting State Tips
- Pre-populate commit history with 2–4 commits that tell a story
- Use realistic branch names: `feature/user-auth`, `develop`, `main`, `hotfix/login-crash`
- Stage or dirty the working tree deliberately — a modified file the player needs to deal with is a mechanic, not noise
- The simulated remote (`origin`) should reflect real divergence by Tier 2+

### Slack Thread Tips
- First message always has `trigger: { type: 'level_start' }`
- Add a mid-level message triggered `after_commit` for longer levels — it rewards progress and can introduce a complication
- Keep messages short. Alex sends 1–2 sentences. Sarah can send 3–4.
- Don't repeat the level instructions verbatim across messages — each message adds something
- Add `variant: 'warning'` messages for constrained levels to nudge players who go off-track (see [Warning Slack Messages](#26-warning-slack-messages) below)

### Target State Tips
- Define target branches as a list of branch names (`string[]`) — the win condition checks that each branch **exists** and has **advanced** (tip hash differs from starting state)
- Commit messages are **not** checked by the win condition — players have freedom in their messages
- `remoteBranches?: string[]` can optionally specify remote branches that must also exist and advance
- Working tree clean unless there's a good reason
- Always double-check par by mentally executing the commands yourself
- Use `requiredCommands` and `forbiddenCommands` to prevent cheating on levels that teach a specific command (see [Command Constraints](#25-command-constraints) below)

---

## 2.5 Command Constraints

Levels that teach a specific git workflow should enforce that the player actually uses the intended commands. Without constraints, many levels can be "cheated" — e.g., using `git merge` instead of `git cherry-pick` on the cherry-pick level.

### `requiredCommands`

An array of git subcommand names that **must** appear in the player's command history for the win condition to pass.

```typescript
targetState: {
  branches: ['main'],
  head: { type: 'branch', name: 'main' },
  workingTreeClean: true,
  requiredCommands: ['cherry-pick'],
  descriptions: {
    requiredCommands: { 'cherry-pick': 'apply a single commit from another branch' },
  },
}
```

The ghost overlay displays required commands with a checkmark/cross so the player knows what's expected.

### `forbiddenCommands`

An array of git subcommand names that must **not** appear in the player's command history.

```typescript
targetState: {
  // ...
  forbiddenCommands: ['merge'],
  descriptions: {
    forbiddenCommands: { merge: 'do NOT merge the whole feature branch' },
  },
}
```

### Limitations

Command tracking stores the **subcommand name only** (e.g., `'commit'`, `'reset'`), not flags. This means `git commit --amend` is tracked as `'commit'`, making it impossible to distinguish from a regular commit. Level 1-03 (Amend a Commit) is not constrained for this reason.

### Levels with constraints

| Level | Required | Forbidden |
|---|---|---|
| 2-04 Stash Your Work | `stash` | — |
| 3-03 Stash Before Merge | `stash`, `merge` | — |
| 3-04 Fix the Last Commit | `reset` | — |
| 4-01 The Cleanup | `rebase` | — |
| 4-02 Cherry-Pick a Fix | `cherry-pick` | `merge` |
| 4-03 Rebase onto Main | `rebase` | `merge` |
| 4-05 The Full Workflow | `rebase`, `merge` | — |

---

## 2.6 Warning Slack Messages

When a player goes off-track on a constrained level, the Slack panel shows a **warning message** — visually distinct with an amber left border and tinted background. These messages are in-character nudges that tell the player what went wrong and what to do instead.

### The `variant` field

`SlackMessage` has an optional `variant` field. Set it to `'warning'` to render the message with amber warning styling:

```typescript
{
  from: 'sarah',
  trigger: { type: 'after_command', command: 'merge' },
  text: 'hold on — you merged the whole branch. use cherry-pick instead.',
  variant: 'warning',
}
```

Messages without a `variant` (or with `variant: 'normal'`) render normally.

### Trigger patterns for warnings

**Pattern 1: Forbidden command used** — Use `after_command` trigger. Fires permanently once the command appears in history (the player can't un-use a command):

```typescript
{
  from: 'marcus',
  trigger: { type: 'after_command', command: 'merge' },
  text: 'merge creates merge commits. we need linear history. use rebase.',
  variant: 'warning',
}
```

**Pattern 2: Wrong approach before correct command** — Use `after_command_without` trigger. Fires when the player uses `command` but has NOT yet used `without`. **Self-correcting** — the message disappears once the player uses the required command:

```typescript
{
  from: 'sarah',
  trigger: { type: 'after_command_without', command: 'add', without: 'stash' },
  text: 'stash your changes first before switching branches.',
  variant: 'warning',
}
```

This example fires when the player uses `git add` without having used `git stash` yet. Once they use `git stash`, the warning disappears automatically.

### Writing good warning messages

- **Stay in character.** Alex uses emoji, Sarah explains, Marcus is blunt.
- **Be specific.** Say what went wrong AND what to do instead: "you merged — undo and cherry-pick".
- **Don't repeat level_start instructions.** The warning adds new information.
- **One warning per constraint.** Don't stack multiple warnings for the same mistake.

---

## 3. Example Levels

---

### Level 1-01: "First Commit"
**Tier:** 1  
**Par:** 3  
**Concept:** `git add`, `git commit`, `git push`

**Starting state:**
```
Commits:
  a1b2c3f  "initial project setup"  (HEAD → main, origin/main)

Working tree:
  Untracked: README.md  (content: "# MyApp\nA cool app.")
```

**Target state:**
```
branches: ["main"]              # main must have advanced
remoteBranches: ["main"]        # origin/main must have advanced
head: { type: 'branch', name: 'main' }
workingTreeClean: true

Narrative (not checked by win condition):
  Player adds README.md, commits, and pushes — main and origin/main advance.
```

**Par solution:**
```bash
git add README.md      # or git add .
git commit -m "add README"
git push
```

**Slack thread:**
```
[Alex, level_start]
hey! can you add a README and push it? repo looks empty 😅

[Alex, after_commit]
nice commit 👍 don't forget to push!
```

---

### Level 2-01: "New Feature Branch"
**Tier:** 2  
**Par:** 5  
**Concept:** `git checkout -b`, `git add`, `git commit`, `git push`

**Starting state:**
```
Commits:
  c3d4e5f  "add login page"  (HEAD → develop, origin/develop)
  b2c3d4e  "add homepage"
  a1b2c3f  "initial commit"  (origin/main, main)

Working tree:
  Modified: login.js  (some new validation logic)
```

**Target state:**
```
branches: ["feature/login-validation"]   # new branch must exist (created during level)
remoteBranches: ["feature/login-validation"]  # must be pushed
head: { type: 'branch', name: 'feature/login-validation' }
workingTreeClean: true

Narrative (not checked by win condition):
  Player creates branch, commits validation logic, and pushes.
```

**Par solution:**
```bash
git checkout -b feature/login-validation
git add login.js
git commit -m "add input validation"
git push origin feature/login-validation
```

**Slack thread:**
```
[Sarah, level_start]
hey, I've made some changes to login.js but forgot to branch first.
can you get them onto a feature branch and push it up?
branch should be off develop. something like feature/login-validation

[Sarah, after_branch_created: "feature/login-validation"]
perfect, that's the right branch 👌

[Alex, after_commit]
looks good, push when ready
```

---

### Level 2-03: "Fast-Forward Merge"
**Tier:** 2  
**Par:** 3  
**Concept:** `git checkout`, `git merge` (fast-forward), `git push`

**Starting state:**
```
Commits:
  f1e2d3c  "add dark mode toggle"  (HEAD → feature/dark-mode)
  e2d3c4b  "style navbar"
  d3c4b5a  "initial commit"  (develop, origin/develop, main, origin/main)

Working tree: clean
```

**Target state:**
```
branches: ["develop"]            # develop must have advanced (merged feature into it)
remoteBranches: ["develop"]      # origin/develop must have advanced (pushed)
head: { type: 'branch', name: 'develop' }
workingTreeClean: true

Narrative (not checked by win condition):
  Player checks out develop, merges feature/dark-mode (fast-forward), and pushes.
```

**Par solution:**
```bash
git checkout develop
git merge feature/dark-mode
git push
```

**Slack thread:**
```
[Alex, level_start]
feature/dark-mode is ready to ship. can you merge it into develop and push?
no conflicts, it branched off the tip so should be clean

[Alex, after_command: "merge"]
nice, fast-forward 🚀
```

---

### Level 3-01: "Merge Conflict"
**Tier:** 3  
**Par:** 5  
**Concept:** `git merge` with conflict → conflict picker → `git add` → `git commit`

**Starting state:**
```
Commits:
  b2c3d4e  "update timeout to 5000"  (HEAD → feature/auth, origin/feature/auth)
  │  [config.js: timeout: 5000]
  │
  a1b2c3f  "initial config"  ← common ancestor
  │  [config.js: timeout: 1000]
  │
  9z8y7x6  "fix retry logic"  (develop, origin/develop)
     [config.js: timeout: 3000]
```

**Conflicting file — config.js:**
```
// Ours (feature/auth):   timeout: 5000
// Theirs (develop):      timeout: 3000
// Ancestor:              timeout: 1000
```

**Target state:**
```
branches: ["develop"]            # develop must have advanced (merge commit created)
head: { type: 'branch', name: 'develop' }
workingTreeClean: true

Narrative (not checked by win condition):
  Player checks out develop, merges feature/auth (triggers conflict in config.js),
  resolves via three-panel editor (keep theirs: timeout: 3000), then adds and commits.
```

**Par solution:**
```bash
git checkout develop
git merge feature/auth
# → three-panel merge editor opens for config.js
# → player clicks "Accept Incoming" (develop version, timeout: 3000) then "Apply Resolution"
git add config.js
git commit
```

**Slack thread:**
```
[Sarah, level_start]
can you merge feature/auth into develop?
heads up — there's a conflict in config.js. 
the 5000ms timeout in feature/auth was a mistake, keep the develop value.

[Sarah, trigger: conflict_triggered]
yep, there it is. remember: keep the develop version of the timeout

[Alex, after_commit]
merged! thanks 🙏
```

---

### Level 4-01: "The Cleanup"
**Tier:** 4  
**Par:** 4  
**Concept:** `git rebase -i` (squash), clean history before merge

**Starting state:**
```
Commits:
  e5f6a7b  "fix typo"              (HEAD → feature/user-profile)
  d4e5f6a  "fix another typo"
  c3d4e5f  "wip: profile page"
  b2c3d4e  "add profile route"
  a1b2c3f  "setup"                 (main, develop, origin/main, origin/develop)

Working tree: clean
```

**Target state:**
```
branches: ["feature/user-profile"]   # must have advanced (squashed commits)
head: { type: 'branch', name: 'feature/user-profile' }
workingTreeClean: true
requiredCommands: ["rebase"]         # player must use rebase -i

Narrative (not checked by win condition):
  Player squashes 4 WIP commits into 1 clean commit via interactive rebase.
```

**Par solution:**
```bash
git rebase -i HEAD~4
# squash all into first, rename to "add user profile page"
# (in MVP: interactive rebase presented as a structured UI, not a raw editor)
```

**Slack thread:**
```
[Marcus, level_start]
before you open the PR, squash those commits on feature/user-profile.
4 commits for one feature is noise. make it one clean commit.

[Marcus, after_command_without: "commit" without: "rebase", variant: warning]
more commits? that's the opposite of cleanup. use git rebase -i to squash them down.

[Marcus, after_command: "rebase"]
better.
```

Note the `after_command_without` trigger: the warning fires when the player commits without having used rebase, nudging them toward the correct approach. It disappears once they use `git rebase`.

---

## 4. Level Progression Map (Full Game)

```
TIER 1 — Basics
  1-01  First Commit               (add, commit, push)
  1-02  Stage Selectively          (add specific files, not git add .)
  1-03  Amend a Commit             (commit --amend)
  1-04  Unstage a File             (reset HEAD <file>)
  1-05  Check Your Work            (status, diff, log)

TIER 2 — Branching
  2-01  New Feature Branch         (checkout -b, push)
  2-02  Switch and Commit          (checkout, add, commit)
  2-03  Fast-Forward Merge         (merge, push)
  2-04  Stash Your Work            (stash, stash pop)
  2-05  Delete a Branch            (branch -d)

TIER 3 — Conflicts & Recovery
  3-01  Merge Conflict             (merge conflict, three-panel editor, add, commit)
  3-02  Conflict: No Hints         (conflict with no Slack guidance)
  3-03  Stash Before Merge         (stash, merge, stash pop, resolve)
  3-04  Fix the Last Commit        (commit --amend after push — force push warning)
  3-05  Partial Reset              (reset HEAD, re-stage selectively)

TIER 4 — Advanced
  4-01  The Cleanup                (rebase -i squash)
  4-02  Cherry-Pick a Fix          (cherry-pick a commit from another branch)
  4-03  Rebase onto Main           (rebase main, resolve conflict)
  4-04  Recover from Reset         (reflog, reset to recover lost commit)
  4-05  The Full Workflow          (combined: branch, work, rebase, squash, merge)
```

---

## 5. The Fictional Codebase

All levels take place in the same fictional project: **"Velo"** — a simple web app for tracking cycling routes. This gives continuity across levels and makes commit messages feel coherent.

Files in the project:
- `README.md`
- `config.js` — app configuration (timeouts, API keys as placeholders)
- `auth.js` — login / authentication logic
- `routes.js` — main routing
- `profile.js` — user profile feature (introduced mid-game)
- `styles.css` — basic styles

The commit history tells a story if you read it across all levels. Alex is the junior dev who moves fast and breaks things. Sarah is the careful one who fixes them. Marcus reviews PRs and doesn't say much.
