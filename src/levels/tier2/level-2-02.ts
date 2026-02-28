// levels/tier2/level-2-02.ts — "Switch and Commit"
// Concept: git checkout between branches, git commit, git push

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial project setup', [], 1000000);
const hash2 = generateHash('add sidebar skeleton', [hash1], 1001000);
const hash3 = generateHash('update nav styles', [hash1], 1002000);

export const level2_02: Scenario = {
  id: 'tier2-02-switch-and-commit',
  tier: 2,
  title: 'Switch and Commit',
  description:
    'Commit staged work on a feature branch, then switch to main and push it.',
  concepts: ['checkout', 'commit', 'push'],
  par: 3,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'initial project setup',
        parentHashes: [],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
        },
        timestamp: 1000000,
      },
      [hash2]: {
        hash: hash2,
        message: 'add sidebar skeleton',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'sidebar.js': {
            content:
              'export function Sidebar() {\n  return "<aside>sidebar</aside>";\n}',
          },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'update nav styles',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'nav.css': { content: '.nav { display: flex; gap: 1rem; }' },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: hash3,
      'feature/sidebar': hash2,
    },
    head: { type: 'branch', name: 'feature/sidebar' },
    index: {
      'sidebar.js':
        'export function Sidebar() {\n  return "<aside>sidebar with links</aside>";\n}',
    },
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: { main: hash1 },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['feature/sidebar'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'sarah',
      text: "You have staged changes on feature/sidebar that need to be committed. After that, please switch to main and push it — the remote is behind by a couple of commits.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: 'Commit first. Then checkout main.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: 'main is pushed, nice! 🎉',
      trigger: { type: 'after_command', command: 'push' },
    },
  ],

  hints: [
    'Commit the staged sidebar changes with "git commit -m \\"update sidebar\\"" ',
    'Switch to main with "git checkout main"',
    'Push main to the remote with "git push"',
  ],
};
