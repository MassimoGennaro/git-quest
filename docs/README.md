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
- **MVP scope:** 4 levels (one per tier), 8 supported git commands (`add`, `branch`, `checkout`, `commit`, `log`, `merge`, `push`, `status`)

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
- [ ] Beta: all 4 tiers complete (20 levels)
- [ ] v1: leaderboard + GitHub auth + community levels
