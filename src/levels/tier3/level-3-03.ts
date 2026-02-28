// levels/tier3/level-3-03.ts — "Stash Before Merge"
// Concept: stash uncommitted work, merge, then stash pop

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial Velo setup', [], 1000000);
const mainHash = generateHash('add ride tracking', [hash1], 1001000);
const featureHash = generateHash('add map integration', [hash1], 1002000);

export const level3_03: Scenario = {
  id: 'tier3-03-stash-before-merge',
  tier: 3,
  title: 'Stash Before Merge',
  description:
    'Stash your uncommitted work, perform a merge, then restore your stash.',
  concepts: ['stash', 'merge', 'stash pop'],
  par: 5,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'initial Velo setup',
        parentHashes: [],
        tree: {
          'index.js': { content: 'import { app } from "./app";\napp.start();' },
          'app.js': {
            content: 'export const app = { start() { console.log("Velo"); } };',
          },
        },
        timestamp: 1000000,
      },
      [mainHash]: {
        hash: mainHash,
        message: 'add ride tracking',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'import { app } from "./app";\napp.start();' },
          'app.js': {
            content: 'export const app = { start() { console.log("Velo"); } };',
          },
          'rides.js': {
            content:
              'export function trackRide(start, end) {\n  return { start, end, time: Date.now() };\n}',
          },
        },
        timestamp: 1001000,
      },
      [featureHash]: {
        hash: featureHash,
        message: 'add map integration',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'import { app } from "./app";\napp.start();' },
          'app.js': {
            content: 'export const app = { start() { console.log("Velo"); } };',
          },
          'map.js': {
            content:
              'export function showMap(coords) {\n  return { lat: coords.lat, lng: coords.lng };\n}',
          },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: mainHash,
      'feature/maps': featureHash,
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'styles.css': {
          status: 'untracked',
          content: '.ride-card { padding: 1rem; border: 1px solid #ddd; }',
        },
      },
    },
    remote: {
      name: 'origin',
      branches: {
        main: mainHash,
        'feature/maps': featureHash,
      },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'sarah',
      text: "I need you to merge feature/maps into main. But you've got uncommitted changes in your working tree — stash them first so the merge goes cleanly.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: 'nice, merge is clean! now pop your stash and commit everything together 👍',
      trigger: { type: 'after_command', command: 'merge' },
    },
    {
      from: 'marcus',
      text: 'good.',
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Stash your uncommitted changes with "git stash"',
    'Merge the feature branch with "git merge feature/maps"',
    'Restore your stashed changes with "git stash pop"',
    'Stage everything with "git add ." or "git add styles.css"',
    'Commit with "git commit -m \\"merge maps and add styles\\""',
  ],
};
