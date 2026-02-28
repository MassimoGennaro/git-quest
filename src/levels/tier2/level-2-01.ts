// levels/tier2/level-2-01.ts — "New Feature Branch"
// Concept: git checkout -b, git push (create a branch and push it)

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial project setup', [], 1000000);
const hash2 = generateHash('add login page', [hash1], 1001000);
const hash3 = generateHash('add login validation', [hash2], 1002000);

export const level2_01: Scenario = {
  id: 'tier2-01-new-feature-branch',
  tier: 2,
  title: 'New Feature Branch',
  description:
    'Create a feature branch from develop and push it to the remote.',
  concepts: ['checkout -b', 'push'],
  par: 2,

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
        message: 'add login page',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'login.js': {
            content: 'function renderLogin() {\n  return "<form>...</form>";\n}',
          },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'add login validation',
        parentHashes: [hash2],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'login.js': {
            content:
              'function renderLogin() {\n  return "<form>...</form>";\n}\nfunction validateLogin(user, pass) {\n  return user.length > 0 && pass.length >= 8;\n}',
          },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: hash1,
      develop: hash3,
    },
    head: { type: 'branch', name: 'develop' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: { main: hash1, develop: hash1 },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['feature/login-validation'],
    remoteBranches: ['feature/login-validation'],
    head: { type: 'branch', name: 'feature/login-validation' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'alex',
      text: "hey! the login validation work on develop should really be on its own feature branch. can you create feature/login-validation and push it up? 🙏",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: 'Use checkout -b to create a new branch at your current position. It will point to the same commit as develop.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: 'branch is up! nice work 🚀',
      trigger: { type: 'after_command', command: 'push' },
    },
  ],

  hints: [
    'Create and switch to the new branch with "git checkout -b feature/login-validation"',
    'Push the new branch to the remote with "git push"',
  ],
};
