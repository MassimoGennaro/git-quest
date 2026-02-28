// levels/tier4/level-4-04.ts — "Recover from Reset"
// Concept: git reflog + git reset to recover a lost commit

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('Velo v3 launch', [], 1000000);
const hash2 = generateHash('add achievement badges', [hash1], 1001000);
const hash3 = generateHash('add streak counter', [hash2], 1002000);

// The scenario: someone ran `git reset --hard HEAD~2` and lost 2 commits.
// The player starts at hash1, but the reflog shows hash3 was the previous HEAD.
// They need to use reflog to find hash3 and reset back to it.

export const level4_04: Scenario = {
  id: 'tier4-04-recover-from-reset',
  tier: 4,
  title: 'Recover from Reset',
  description:
    'Use git reflog to find a lost commit after an accidental hard reset, then restore it.',
  concepts: ['reflog', 'reset'],
  par: 2,

  startingState: {
    // The commits still exist in the object store — git doesn't delete them immediately
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'Velo v3 launch',
        parentHashes: [],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "3.0.0" }',
          },
        },
        timestamp: 1000000,
      },
      [hash2]: {
        hash: hash2,
        message: 'add achievement badges',
        parentHashes: [hash1],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "3.0.0" }',
          },
          'badges.js': {
            content:
              'export const badges = [\n  { id: "first-ride", name: "First Ride", icon: "🚴" },\n  { id: "century", name: "Century", icon: "💯" },\n];',
          },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'add streak counter',
        parentHashes: [hash2],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "3.0.0" }',
          },
          'badges.js': {
            content:
              'export const badges = [\n  { id: "first-ride", name: "First Ride", icon: "🚴" },\n  { id: "century", name: "Century", icon: "💯" },\n];',
          },
          'streaks.js': {
            content:
              'export function getStreak(rides) {\n  let streak = 0;\n  for (const ride of rides) {\n    if (ride.date === yesterday()) streak++;\n    else break;\n  }\n  return streak;\n}',
          },
        },
        timestamp: 1002000,
      },
    },
    // Branch pointer has been reset to hash1 (simulating `git reset --hard HEAD~2`)
    branches: {
      main: hash1,
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: { main: hash1 },
    },
    stash: [],
    // The reflog tells the story of what happened
    reflog: [
      {
        hash: hash1,
        description: 'reset: moving to HEAD~2',
      },
      {
        hash: hash3,
        description: 'commit: add streak counter',
      },
      {
        hash: hash2,
        description: 'commit: add achievement badges',
      },
      {
        hash: hash1,
        description: 'commit (initial): Velo v3 launch',
      },
    ],
  },

  targetState: {
    branches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'alex',
      text: "I accidentally ran git reset --hard HEAD~2 and lost two commits! the badges and streaks code is gone! 😱 can you recover them? the commits should still be in the reflog.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: 'Run "git reflog" to see the history of HEAD. Find the hash of the commit before the reset, then use "git reset --hard <hash>" to restore it.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: 'recovered. well done.',
      trigger: { type: 'after_command', command: 'reset' },
    },
  ],

  hints: [
    'Run "git reflog" to see the history of HEAD movements',
    `Find the hash for "add streak counter" — it should be ${hash3.slice(0, 7)}`,
    `Reset to that commit with "git reset --hard ${hash3.slice(0, 7)}"`,
  ],
};
