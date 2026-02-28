// levels/tier3/level-3-02.ts — "Conflict: No Hints"
// Concept: merge conflict resolution without Slack guidance

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const baseHash = generateHash('add route handler', [], 1000000);
const mainHash = generateHash('update error messages', [baseHash], 1001000);
const featureHash = generateHash(
  'refactor error handling',
  [baseHash],
  1002000,
);

export const level3_02: Scenario = {
  id: 'tier3-02-conflict-no-hints',
  tier: 3,
  title: 'Conflict: No Hints',
  description:
    'Merge a conflicting branch with no Slack guidance on which version to keep.',
  concepts: ['merge', 'conflict resolution', 'push'],
  par: 6,

  startingState: {
    commits: {
      [baseHash]: {
        hash: baseHash,
        message: 'add route handler',
        parentHashes: [],
        tree: {
          'routes.js': {
            content:
              'export const routes = [\n  { path: "/", handler: home },\n  { path: "/about", handler: about },\n];',
          },
          'errors.js': {
            content:
              'export function handleError(err) {\n  return { status: 500, message: "Internal error" };\n}',
          },
        },
        timestamp: 1000000,
      },
      [mainHash]: {
        hash: mainHash,
        message: 'update error messages',
        parentHashes: [baseHash],
        tree: {
          'routes.js': {
            content:
              'export const routes = [\n  { path: "/", handler: home },\n  { path: "/about", handler: about },\n];',
          },
          'errors.js': {
            content:
              'export function handleError(err) {\n  console.error(err);\n  return { status: 500, message: "Something went wrong" };\n}',
          },
        },
        timestamp: 1001000,
      },
      [featureHash]: {
        hash: featureHash,
        message: 'refactor error handling',
        parentHashes: [baseHash],
        tree: {
          'routes.js': {
            content:
              'export const routes = [\n  { path: "/", handler: home },\n  { path: "/about", handler: about },\n];',
          },
          'errors.js': {
            content:
              'export function handleError(err) {\n  return { status: err.code || 500, message: err.message || "Unknown error" };\n}',
          },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: mainHash,
      'feature/error-handling': featureHash,
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: {
        main: mainHash,
        'feature/error-handling': featureHash,
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
    descriptions: {
      branches: { main: 'merged feature/error-handling, conflict resolved' },
      remoteBranches: { main: 'pushed to remote' },
      head: 'on main',
      workingTree: 'merge completed cleanly',
    },
  },

  slackThread: [
    {
      from: 'marcus',
      text: 'merge feature/error-handling into main. there may be a conflict. figure it out.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: 'good luck, no hints this time 😬',
      trigger: { type: 'conflict_triggered' },
    },
    {
      from: 'sarah',
      text: 'done. now push so the team has it.',
      trigger: { type: 'after_commit' },
    },
    {
      from: 'marcus',
      text: 'pushed. nice work handling that on your own.',
      trigger: { type: 'after_command', command: 'push' },
    },
  ],

  hints: [
    'Run "git merge feature/error-handling" to start the merge',
    'Resolve the conflict in the picker — choose whichever version makes sense',
    'Stage the resolved file with "git add errors.js"',
    'Complete the merge with "git commit"',
    'Push with "git push"',
  ],
};
