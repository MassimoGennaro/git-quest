// levels/tier4/level-4-05.ts — "The Full Workflow"
// Concept: combined workflow — branch, work, rebase -i squash, merge

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('Velo v3 stable', [], 1000000);
const mainHash2 = generateHash('fix typo in footer', [hash1], 1001000);

export const level4_05: Scenario = {
  id: 'tier4-05-the-full-workflow',
  tier: 4,
  title: 'The Full Workflow',
  description:
    'Complete a real dev workflow: branch, commit, squash with rebase -i, then merge to main.',
  concepts: ['checkout -b', 'commit', 'rebase -i', 'merge'],
  par: 8,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'Velo v3 stable',
        parentHashes: [],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'app.js': {
            content:
              'export const app = {\n  listen(port) { console.log(`Velo running on ${port}`); },\n};',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "3.0.0" }',
          },
        },
        timestamp: 1000000,
      },
      [mainHash2]: {
        hash: mainHash2,
        message: 'fix typo in footer',
        parentHashes: [hash1],
        tree: {
          'index.js': {
            content: 'import { app } from "./app";\napp.listen(3000);',
          },
          'app.js': {
            content:
              'export const app = {\n  listen(port) { console.log(`Velo running on ${port}`); },\n};',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "3.0.0" }',
          },
          'footer.js': {
            content:
              'export function Footer() {\n  return "<footer>Velo &copy; 2025</footer>";\n}',
          },
        },
        timestamp: 1001000,
      },
    },
    branches: {
      main: mainHash2,
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'notifications.js': {
          status: 'untracked',
          content:
            'export function notify(msg) {\n  return { text: msg, read: false };\n}',
        },
        'notifications.test.js': {
          status: 'untracked',
          content:
            'import { notify } from "./notifications";\ntest("creates notification", () => {\n  const n = notify("hello");\n  expect(n.read).toBe(false);\n});',
        },
      },
    },
    remote: {
      name: 'origin',
      branches: { main: mainHash2 },
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
      from: 'marcus',
      text: "final level. you've got two untracked files for a notifications feature. here's the workflow: (1) create a feature branch, (2) make two separate commits — one for the module, one for the test, (3) squash them into one clean commit with rebase -i, (4) checkout main and merge your feature branch, (5) push.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: 'start by creating a feature branch off main. something like feature/notifications.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: 'two commits on the branch, nice! now squash them with git rebase -i HEAD~2 before merging 💪',
      trigger: { type: 'after_commit' },
    },
    {
      from: 'marcus',
      text: 'squashed. merge and push.',
      trigger: { type: 'after_command', command: 'rebase' },
    },
  ],

  hints: [
    'Create a feature branch: "git checkout -b feature/notifications"',
    'Stage and commit the module: "git add notifications.js" then "git commit -m \\"add notifications module\\""',
    'Stage and commit the test: "git add notifications.test.js" then "git commit -m \\"add notifications test\\""',
    'Squash: "git rebase -i HEAD~2" and squash the second commit into the first',
    'Switch to main: "git checkout main"',
    'Merge: "git merge feature/notifications"',
    'Push: "git push"',
  ],
};
