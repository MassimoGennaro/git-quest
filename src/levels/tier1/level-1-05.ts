// levels/tier1/level-1-05.ts — "Check Your Work"
// Concept: status, diff, log (read-only commands) + add/commit/push

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const initialHash = generateHash('initial project setup', [], 1000000);
const routesHash = generateHash('add route handlers', [initialHash], 1000400);
const middlewareHash = generateHash('add auth middleware', [routesHash], 1000500);

export const level1_05: Scenario = {
  id: 'tier1-05-check-your-work',
  tier: 1,
  title: 'Check Your Work',
  description:
    'Use status, diff, and log to understand changes before committing.',
  concepts: ['status', 'diff', 'log'],
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
      [routesHash]: {
        hash: routesHash,
        message: 'add route handlers',
        parentHashes: [initialHash],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'routes.js': { content: 'app.get("/", home);\napp.get("/about", about);' },
        },
        timestamp: 1000400,
      },
      [middlewareHash]: {
        hash: middlewareHash,
        message: 'add auth middleware',
        parentHashes: [routesHash],
        tree: {
          'index.js': { content: 'console.log("Hello Velo!")' },
          'package.json': { content: '{ "name": "velo", "version": "1.0.0" }' },
          'routes.js': { content: 'app.get("/", home);\napp.get("/about", about);' },
          'middleware.js': { content: 'function requireAuth(req, res, next) {\n  if (!req.user) return res.status(401).end();\n  next();\n}' },
        },
        timestamp: 1000500,
      },
    },
    branches: { main: middlewareHash },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'routes.js': {
          status: 'modified',
          content: 'app.get("/", home);\napp.get("/about", about);\napp.get("/dashboard", requireAuth, dashboard);\napp.post("/login", login);',
        },
      },
    },
    remote: { name: 'origin', branches: { main: middlewareHash } },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
    descriptions: {
      branches: { main: 'routes.js changes committed' },
      remoteBranches: { main: 'pushed to remote' },
      head: 'on main',
      workingTree: 'all changes committed',
    },
  },

  slackThread: [
    {
      from: 'sarah',
      text: "Something changed in routes.js but I'm not sure exactly what. Can you check the diff and commit it if it looks right?",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: "Try git status and git diff first — always good to review before committing. git log shows the history if you need context.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: "looks good, ship it! 🚢",
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Try "git status" to see what changed',
    'Use "git diff" to see the actual changes in routes.js',
    'Use "git log" to see the commit history',
    'Stage with "git add routes.js", commit, and push',
  ],
};
