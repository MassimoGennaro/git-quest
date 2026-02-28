// levels/tier2/level-2-04.ts — "Stash Your Work"
// Concept: git stash, git stash pop, git checkout, git add, git commit

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial project setup', [], 1000000);
const hash2 = generateHash('add dashboard layout', [hash1], 1001000);

export const level2_04: Scenario = {
  id: 'tier2-04-stash-your-work',
  tier: 2,
  title: 'Stash Your Work',
  description:
    'Stash uncommitted changes, switch branches, then pop and commit.',
  concepts: ['stash', 'stash pop', 'checkout'],
  par: 5,

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
        message: 'add dashboard layout',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'dashboard.js': {
            content:
              'export function Dashboard() {\n  return "<div>Dashboard</div>";\n}',
          },
        },
        timestamp: 1001000,
      },
    },
    branches: {
      main: hash1,
      'feature/dashboard': hash2,
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'dashboard.js': {
          status: 'modified',
          content:
            'export function Dashboard() {\n  return "<div>Dashboard with charts</div>";\n}',
        },
      },
    },
    remote: {
      name: 'origin',
      branches: { main: hash1, 'feature/dashboard': hash2 },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['feature/dashboard'],
    head: { type: 'branch', name: 'feature/dashboard' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'alex',
      text: "you've got dashboard changes on main but they belong on feature/dashboard. stash them, switch branches, pop, and commit there 👌",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: 'Use "git stash" to temporarily save your changes. Your working tree will be clean so you can switch branches safely.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: 'Good. Pop and commit.',
      trigger: { type: 'after_command', command: 'checkout' },
    },
    {
      from: 'alex',
      text: 'stash workflow nailed it! 🎯',
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Save your changes with "git stash"',
    'Switch to the feature branch with "git checkout feature/dashboard"',
    'Restore your changes with "git stash pop"',
    'Stage the file with "git add dashboard.js"',
    'Commit with "git commit -m \\"add charts to dashboard\\""',
  ],
};
