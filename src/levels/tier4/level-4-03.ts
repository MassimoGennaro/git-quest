// levels/tier4/level-4-03.ts — "Rebase onto Main"
// Concept: git rebase main from a feature branch, resolve conflict

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('Velo v3 base', [], 1000000);
// main has advanced
const mainHash2 = generateHash('update API endpoint', [hash1], 1001000);
// feature branch diverged from hash1
const featureHash2 = generateHash(
  'add leaderboard API call',
  [hash1],
  1002000,
);

export const level4_03: Scenario = {
  id: 'tier4-03-rebase-onto-main',
  tier: 4,
  title: 'Rebase onto Main',
  description:
    'Rebase your feature branch onto the updated main branch and resolve any conflicts.',
  concepts: ['rebase', 'conflict resolution'],
  par: 5,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'Velo v3 base',
        parentHashes: [],
        tree: {
          'api.js': {
            content:
              'const BASE_URL = "https://api.velo.dev/v2";\nexport function fetchRides() {\n  return fetch(BASE_URL + "/rides");\n}',
          },
          'index.js': {
            content: 'import { fetchRides } from "./api";\nfetchRides();',
          },
        },
        timestamp: 1000000,
      },
      [mainHash2]: {
        hash: mainHash2,
        message: 'update API endpoint',
        parentHashes: [hash1],
        tree: {
          'api.js': {
            content:
              'const BASE_URL = "https://api.velo.dev/v3";\nexport function fetchRides() {\n  return fetch(BASE_URL + "/rides");\n}',
          },
          'index.js': {
            content: 'import { fetchRides } from "./api";\nfetchRides();',
          },
        },
        timestamp: 1001000,
      },
      [featureHash2]: {
        hash: featureHash2,
        message: 'add leaderboard API call',
        parentHashes: [hash1],
        tree: {
          'api.js': {
            content:
              'const BASE_URL = "https://api.velo.dev/v2";\nexport function fetchRides() {\n  return fetch(BASE_URL + "/rides");\n}\nexport function fetchLeaderboard() {\n  return fetch(BASE_URL + "/leaderboard");\n}',
          },
          'index.js': {
            content: 'import { fetchRides } from "./api";\nfetchRides();',
          },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: mainHash2,
      'feature/leaderboard': featureHash2,
    },
    head: { type: 'branch', name: 'feature/leaderboard' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: {
        main: mainHash2,
      },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['feature/leaderboard'],
    head: { type: 'branch', name: 'feature/leaderboard' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'marcus',
      text: 'main has moved forward with an API endpoint update. rebase feature/leaderboard onto main before the PR. there will be a conflict in api.js — keep the v3 endpoint but preserve your leaderboard function.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: 'conflict in api.js as expected. the correct resolution: accept the incoming (main) changes for the BASE_URL line, but make sure your fetchLeaderboard function is preserved.',
      trigger: { type: 'conflict_triggered' },
    },
    {
      from: 'alex',
      text: 'rebased cleanly! feature branch is up to date 🎯',
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Run "git rebase main" to start rebasing onto main',
    'Resolve the conflict in api.js — keep the v3 URL from main',
    'Stage the resolved file with "git add api.js"',
    'Continue the rebase with "git commit"',
  ],
};
