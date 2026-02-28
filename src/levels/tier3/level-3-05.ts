// levels/tier3/level-3-05.ts — "Partial Reset"
// Concept: git reset HEAD to unstage everything, then selectively re-stage

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial Velo app', [], 1000000);
const hash2 = generateHash('add ride history page', [hash1], 1001000);

export const level3_05: Scenario = {
  id: 'tier3-05-partial-reset',
  tier: 3,
  title: 'Partial Reset',
  description:
    'Unstage all files, then selectively re-stage only the ones that belong in this commit.',
  concepts: ['reset', 'add', 'selective staging'],
  par: 4,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'initial Velo app',
        parentHashes: [],
        tree: {
          'index.js': { content: 'import { app } from "./app";\napp.start();' },
          'package.json': {
            content: '{ "name": "velo", "version": "2.1.0" }',
          },
        },
        timestamp: 1000000,
      },
      [hash2]: {
        hash: hash2,
        message: 'add ride history page',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'import { app } from "./app";\napp.start();' },
          'package.json': {
            content: '{ "name": "velo", "version": "2.1.0" }',
          },
          'history.js': {
            content:
              'export function getHistory() {\n  return fetch("/api/rides");\n}',
          },
        },
        timestamp: 1001000,
      },
    },
    branches: {
      main: hash2,
    },
    head: { type: 'branch', name: 'main' },
    // Someone ran git add . and staged everything — including debug files
    index: {
      'stats.js':
        'export function calcStats(rides) {\n  return { total: rides.length, avg: rides.reduce((a,r) => a + r.distance, 0) / rides.length };\n}',
      'stats.test.js':
        'import { calcStats } from "./stats";\ntest("calculates total", () => {\n  expect(calcStats([{distance:10},{distance:20}]).total).toBe(2);\n});',
      'debug.log': 'DEBUG 2025-06-15T10:23:44 [server] Starting...\nDEBUG 2025-06-15T10:23:45 [db] Connected',
      'temp-notes.txt': 'TODO: remember to update the API endpoint\nFIXME: stats formula might be wrong',
    },
    workingTree: {
      files: {
        'debug.log': {
          status: 'modified',
          content: 'DEBUG 2025-06-15T10:23:44 [server] Starting...\nDEBUG 2025-06-15T10:23:45 [db] Connected',
        },
        'temp-notes.txt': {
          status: 'modified',
          content: 'TODO: remember to update the API endpoint\nFIXME: stats formula might be wrong',
        },
      },
    },
    remote: {
      name: 'origin',
      branches: { main: hash2 },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: false,
  },

  slackThread: [
    {
      from: 'alex',
      text: "oops, I ran git add . and staged everything including debug.log and temp-notes.txt 😅 can you unstage everything and only commit the actual code files? stats.js and stats.test.js should go in, the rest should not.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: 'Use "git reset" to unstage everything, then "git add" only the files you want.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: 'clean commit. push it.',
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Unstage all files with "git reset" (no arguments)',
    'Re-stage only the code files: "git add stats.js" and "git add stats.test.js"',
    'Commit with "git commit -m \\"add ride stats\\""',
    'Push with "git push"',
  ],
};
