// levels/tier1/level-1-04.ts — "Unstage a File"
// Concept: git reset HEAD <file>

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const initialHash = generateHash('initial project setup', [], 1000000);
const configHash = generateHash('add config loader', [initialHash], 1000300);

export const level1_04: Scenario = {
  id: 'tier1-04-unstage-file',
  tier: 1,
  title: 'Unstage a File',
  description:
    'A secrets file was accidentally staged. Unstage it before committing.',
  concepts: ['reset'],
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
      [configHash]: {
        hash: configHash,
        message: 'add config loader',
        parentHashes: [initialHash],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'config.loader.js': { content: 'const config = require("./config.js");\nmodule.exports = config;' },
        },
        timestamp: 1000300,
      },
    },
    branches: { main: configHash },
    head: { type: 'branch', name: 'main' },
    index: {
      'config.js': 'module.exports = {\n  port: process.env.PORT || 3000,\n  db: process.env.DB_URL,\n};',
      'secrets.env': 'DB_PASSWORD=supersecret123\nAPI_KEY=sk_live_abc123\nJWT_SECRET=myjwtsecret',
    },
    workingTree: {
      files: {
        'secrets.env': {
          status: 'modified',
          content: 'DB_PASSWORD=supersecret123\nAPI_KEY=sk_live_abc123\nJWT_SECRET=myjwtsecret',
        },
      },
    },
    remote: { name: 'origin', branches: { main: configHash } },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: false,
    descriptions: {
      branches: { main: 'commit with config.js only' },
      remoteBranches: { main: 'pushed to remote' },
      head: 'on main',
      workingTree: 'secrets.env unstaged, not committed',
    },
  },

  slackThread: [
    {
      from: 'alex',
      text: "wait wait wait 🚨 I accidentally staged secrets.env! do NOT commit that! unstage it before you do anything else!",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: "Use git reset HEAD secrets.env to unstage it. The file will stay in your working directory but won't be part of the next commit.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: "Good. Now commit config.js and push.",
      trigger: { type: 'after_command', command: 'reset' },
    },
  ],

  hints: [
    'Unstage the secrets file with "git reset HEAD secrets.env"',
    'Commit the remaining staged file with "git commit -m \\"message\\""',
    'Push to remote with "git push"',
  ],
};
