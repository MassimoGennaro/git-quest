// levels/tier4/level-4-02.ts — "Cherry-Pick a Fix"
// Concept: git cherry-pick to apply a single commit from another branch

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial Velo v3', [], 1000000);
const hash2 = generateHash('add GPS tracker', [hash1], 1001000);
const hash3 = generateHash('fix crash on null coords', [hash2], 1002000);
const hash4 = generateHash('add route planner', [hash3], 1003000);
// main has diverged with its own commit
const mainHash2 = generateHash('update homepage banner', [hash1], 1001500);

export const level4_02: Scenario = {
  id: 'tier4-02-cherry-pick-a-fix',
  tier: 4,
  title: 'Cherry-Pick a Fix',
  description:
    'Cherry-pick a critical bug fix from a feature branch onto main without merging the whole branch.',
  concepts: ['cherry-pick'],
  par: 3,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'initial Velo v3',
        parentHashes: [],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'gps.js': {
            content:
              'export function getCoords() {\n  return navigator.geolocation.getCurrentPosition();\n}',
          },
        },
        timestamp: 1000000,
      },
      [hash2]: {
        hash: hash2,
        message: 'add GPS tracker',
        parentHashes: [hash1],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'gps.js': {
            content:
              'export function getCoords() {\n  return navigator.geolocation.getCurrentPosition();\n}\nexport function trackPosition() {\n  const pos = getCoords();\n  return { lat: pos.coords.latitude, lng: pos.coords.longitude };\n}',
          },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'fix crash on null coords',
        parentHashes: [hash2],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'gps.js': {
            content:
              'export function getCoords() {\n  return navigator.geolocation.getCurrentPosition();\n}\nexport function trackPosition() {\n  const pos = getCoords();\n  if (!pos || !pos.coords) return null;\n  return { lat: pos.coords.latitude, lng: pos.coords.longitude };\n}',
          },
        },
        timestamp: 1002000,
      },
      [hash4]: {
        hash: hash4,
        message: 'add route planner',
        parentHashes: [hash3],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'gps.js': {
            content:
              'export function getCoords() {\n  return navigator.geolocation.getCurrentPosition();\n}\nexport function trackPosition() {\n  const pos = getCoords();\n  if (!pos || !pos.coords) return null;\n  return { lat: pos.coords.latitude, lng: pos.coords.longitude };\n}',
          },
          'planner.js': {
            content:
              'export function planRoute(start, end) {\n  return { waypoints: [start, end], distance: 0 };\n}',
          },
        },
        timestamp: 1003000,
      },
      [mainHash2]: {
        hash: mainHash2,
        message: 'update homepage banner',
        parentHashes: [hash1],
        tree: {
          'index.js': {
            content:
              'import { app } from "./app";\napp.listen(3000);\n// v3 launch banner',
          },
          'gps.js': {
            content:
              'export function getCoords() {\n  return navigator.geolocation.getCurrentPosition();\n}',
          },
        },
        timestamp: 1001500,
      },
    },
    branches: {
      main: mainHash2,
      'feature/gps': hash4,
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: {
        main: mainHash2,
        'feature/gps': hash4,
      },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'sarah',
      text: "there's a null pointer crash in production from gps.js. the fix is in feature/gps — the commit \"fix crash on null coords\". cherry-pick just that fix onto main and push. do NOT merge the whole feature branch.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: 'cherry-pick applied. push it.',
      trigger: { type: 'after_command', command: 'cherry-pick' },
    },
    {
      from: 'alex',
      text: 'hotfix deployed, crisis averted 🚒',
      trigger: { type: 'after_command', command: 'push' },
    },
  ],

  hints: [
    'Use "git log" on the feature/gps branch to find the hash of "fix crash on null coords"',
    `Cherry-pick the fix with "git cherry-pick ${hash3}"`,
    'Push with "git push"',
  ],
};
