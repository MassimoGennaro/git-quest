// levels/tier2/level-2-05.ts — "Delete a Branch"
// Concept: git checkout, git branch -d, git push

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial project setup', [], 1000000);
const hash2 = generateHash('add search module', [hash1], 1001000);
const hash3 = generateHash('merge search into main', [hash1, hash2], 1002000);

export const level2_05: Scenario = {
  id: 'tier2-05-delete-branch',
  tier: 2,
  title: 'Delete a Branch',
  description:
    'Clean up a merged feature branch and push the updated main.',
  concepts: ['checkout', 'branch -d', 'push'],
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
        message: 'add search module',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'search.js': {
            content:
              'export function search(query) {\n  return results.filter(r => r.includes(query));\n}',
          },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'merge search into main',
        parentHashes: [hash1, hash2],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'search.js': {
            content:
              'export function search(query) {\n  return results.filter(r => r.includes(query));\n}',
          },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: hash3,
      'feature/old-search': hash2,
    },
    head: { type: 'branch', name: 'feature/old-search' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: { main: hash1 },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: [],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
    descriptions: {
      remoteBranches: { main: 'pushed to remote' },
      head: 'on main',
      workingTree: 'no uncommitted changes',
    },
  },

  slackThread: [
    {
      from: 'marcus',
      text: 'feature/old-search was merged. Delete it and push main.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: "You can't delete the branch you're currently on. Switch to main first, then use git branch -d to remove it. Don't forget to push main afterwards — the remote is behind.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: 'clean repo, clean mind 🧹',
      trigger: { type: 'after_command', command: 'branch' },
    },
  ],

  hints: [
    'Switch to main first with "git checkout main"',
    'Delete the old branch with "git branch -d feature/old-search"',
    'Push the updated main with "git push"',
  ],
};
