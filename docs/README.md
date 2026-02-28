# GitQuest — Project Overview

A browser-based learning game where players solve git challenges by typing real git commands in a simulated terminal. The core experience: read a Slack-style conversation from fictional coworkers, observe an interactive git graph, and execute commands to reach the target repository state.

## Repositories & Docs

| File | Purpose |
|---|---|
| `README.md` | This file — project overview and links |
| `SPEC.md` | Full product & gameplay specification |
| `ARCHITECTURE.md` | Technical architecture & data models |
| `LEVELS.md` | Level design guide + example scenarios |

## Quick Summary

- **Genre:** Puzzle / educational game
- **Platform:** Browser (pure frontend MVP)
- **Stack:** React 18, TypeScript (strict), Tailwind CSS, Vite, custom SVG graph renderer, in-browser git simulation engine
- **Levels:** 20 levels across 4 difficulty tiers (Easy, Medium, Hard, Pro — 5 per tier)
- **Supported git commands (14):** `add`, `branch`, `checkout`, `cherry-pick`, `commit`, `diff`, `log`, `merge`, `push`, `rebase`, `reflog`, `reset`, `stash`, `status`

## Getting Started (Development)

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build (tsc && vite build)
npm run preview      # Preview production build locally
npm test             # Run all tests via Vitest (watch mode)
npx vitest run       # Run all tests once (CI mode)
```

## Roadmap

- [x] MVP: core simulation engine + SVG graph renderer + terminal + 4 levels
- [x] Conflict system: three-panel merge editor (ours | result | theirs)
- [x] Undo/retry + par-based scoring with localStorage persistence
- [x] 6 new engine commands: diff, stash, reset, reflog, cherry-pick, rebase (regular + interactive)
- [x] 20 levels across 4 tiers (Easy, Medium, Hard, Pro)
- [x] Full-screen level selector with difficulty grouping and progress tracking
- [x] Interactive rebase picker UI (pick / squash / drop)
- [x] Enhanced progress persistence (stars + best move count per level)
- [ ] v1: leaderboard + GitHub auth + community levels
