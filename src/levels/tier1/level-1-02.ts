// levels/tier1/level-1-02.ts — "Stage Selectively"
// Concept: git add specific files (not git add .)

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const initialHash = generateHash('initial project setup', [], 1000000);
const secondHash = generateHash('add routing skeleton', [initialHash], 1000100);

export const level1_02: Scenario = {
  id: 'tier1-02-stage-selectively',
  tier: 1,
  title: 'Stage Selectively',
  description:
    'Stage only the files you want — leave debug.log out of the commit.',
  concepts: ['add'],
  par: 4,

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
      [secondHash]: {
        hash: secondHash,
        message: 'add routing skeleton',
        parentHashes: [initialHash],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'app.js': { content: 'const express = require("express");\nconst app = express();' },
        },
        timestamp: 1000100,
      },
    },
    branches: { main: secondHash },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'auth.js': {
          status: 'untracked',
          content: 'function login(user, pass) {\n  return authenticate(user, pass);\n}',
        },
        'routes.js': {
          status: 'untracked',
          content: 'app.get("/dashboard", requireAuth, dashboard);\napp.post("/login", login);',
        },
        'debug.log': {
          status: 'untracked',
          content: '[DEBUG] server started at port 3000\n[DEBUG] db connection established',
        },
      },
    },
    remote: { name: 'origin', branches: { main: secondHash } },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: false,
    descriptions: {
      branches: { main: 'commit with auth.js and routes.js only' },
      remoteBranches: { main: 'pushed to remote' },
      head: 'on main',
      workingTree: 'debug.log remains untracked',
    },
  },

  slackThread: [
    {
      from: 'alex',
      text: "yo, I dropped auth.js and routes.js in the repo. can you stage and commit them? do NOT add debug.log tho, that's my local junk 😬",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: "Good practice: stage files individually with git add <file> instead of git add . — keeps unwanted files out of history.",
      trigger: { type: 'after_command', command: 'add' },
    },
    {
      from: 'alex',
      text: "nice, now push it up! 🚀",
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Use "git add auth.js" and "git add routes.js" separately',
    "Don't add debug.log!",
    'Use "git commit -m \\"message\\"" to commit',
    'Use "git push" to push to the remote',
  ],
};
