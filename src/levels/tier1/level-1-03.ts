// levels/tier1/level-1-03.ts — "Amend a Commit"
// Concept: git commit --amend

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const initialHash = generateHash('initial project setup', [], 1000000);
const authHash = generateHash('add auth module', [initialHash], 1000200);

export const level1_03: Scenario = {
  id: 'tier1-03-amend-commit',
  tier: 1,
  title: 'Amend a Commit',
  description:
    'A file was left out of the last commit. Amend it to include the missing test.',
  concepts: ['commit --amend'],
  par: 3,

  startingState: {
    commits: {
      [initialHash]: {
        hash: initialHash,
        message: 'initial project setup',
        parentHashes: [],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
        },
        timestamp: 1000000,
      },
      [authHash]: {
        hash: authHash,
        message: 'add auth module',
        parentHashes: [initialHash],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'auth.js': { content: 'function login(user, pass) {\n  return authenticate(user, pass);\n}' },
        },
        timestamp: 1000200,
      },
    },
    branches: { main: authHash },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'auth.test.js': {
          status: 'untracked',
          content: 'describe("login", () => {\n  it("should return token on valid creds", () => {\n    expect(login("admin", "pass")).toBeTruthy();\n  });\n});',
        },
      },
    },
    remote: { name: 'origin', branches: { main: initialHash } },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
    descriptions: {
      branches: { main: 'amended commit includes auth.test.js' },
      remoteBranches: { main: 'pushed to remote' },
      head: 'on main',
      workingTree: 'all files committed',
    },
  },

  slackThread: [
    {
      from: 'sarah',
      text: "I just realized I forgot to include auth.test.js in my last commit. Can you amend it so the test file is part of the same commit?",
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: "Stage it first, then commit --amend.",
      trigger: { type: 'after_command', command: 'add' },
    },
    {
      from: 'sarah',
      text: "Perfect, now push it to origin so CI can pick it up.",
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Stage the missing file with "git add auth.test.js"',
    'Amend the commit with "git commit --amend"',
    'Push to remote with "git push"',
  ],
};
