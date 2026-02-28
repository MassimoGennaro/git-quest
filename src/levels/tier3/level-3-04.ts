// levels/tier3/level-3-04.ts — "Fix the Last Commit"
// Concept: git reset --soft HEAD~1 to undo and redo a commit

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial Velo config', [], 1000000);
const hash2 = generateHash('add auth module', [hash1], 1001000);
// The "bad" commit that the player needs to undo and redo
const hash3 = generateHash('add password validation', [hash2], 1002000);

export const level3_04: Scenario = {
  id: 'tier3-04-fix-last-commit',
  tier: 3,
  title: 'Fix the Last Commit',
  description:
    'Undo the last commit with reset --soft, add a missing file, and recommit.',
  concepts: ['reset --soft'],
  par: 4,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'initial Velo config',
        parentHashes: [],
        tree: {
          'config.js': {
            content: 'module.exports = { port: 3000, env: "development" };',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "2.0.0" }',
          },
        },
        timestamp: 1000000,
      },
      [hash2]: {
        hash: hash2,
        message: 'add auth module',
        parentHashes: [hash1],
        tree: {
          'config.js': {
            content: 'module.exports = { port: 3000, env: "development" };',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "2.0.0" }',
          },
          'auth.js': {
            content:
              'export function login(user, pass) {\n  return authenticate(user, pass);\n}',
          },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'add password validation',
        parentHashes: [hash2],
        tree: {
          'config.js': {
            content: 'module.exports = { port: 3000, env: "development" };',
          },
          'package.json': {
            content: '{ "name": "velo", "version": "2.0.0" }',
          },
          'auth.js': {
            content:
              'export function login(user, pass) {\n  return authenticate(user, pass);\n}',
          },
          'validate.js': {
            content:
              'export function validatePassword(pass) {\n  return pass.length >= 8;\n}',
          },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: hash3,
    },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'validate.test.js': {
          status: 'untracked',
          content:
            'import { validatePassword } from "./validate";\n\ntest("rejects short passwords", () => {\n  expect(validatePassword("abc")).toBe(false);\n});',
        },
      },
    },
    remote: {
      name: 'origin',
      branches: { main: hash2 },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['main'],
    remoteBranches: ['main'],
    head: { type: 'branch', name: 'main' },
    workingTreeClean: true,
    requiredCommands: ['reset'],
    descriptions: {
      branches: { main: 'recommitted with validate.test.js included' },
      remoteBranches: { main: 'pushed to remote' },
      head: 'on main',
      workingTree: 'all files committed',
      requiredCommands: { reset: 'undo the last commit with reset --soft' },
    },
  },

  slackThread: [
    {
      from: 'sarah',
      text: "you committed validate.js but forgot to include validate.test.js in the same commit. use reset --soft to undo the commit, add the test file, and recommit both together. then push.",
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: "adding more files won't fix the old commit. use git reset --soft HEAD~1 to undo it first, then recommit with everything included.",
      trigger: { type: 'after_command_without', command: 'add', without: 'reset' },
      variant: 'warning',
    },
    {
      from: 'alex',
      text: 'reset done! now add the test file and recommit 💪',
      trigger: { type: 'after_command', command: 'reset' },
    },
    {
      from: 'marcus',
      text: 'pushed. clean.',
      trigger: { type: 'after_command', command: 'push' },
    },
  ],

  hints: [
    'Undo the last commit with "git reset --soft HEAD~1" — your changes stay staged',
    'Stage the test file with "git add validate.test.js"',
    'Recommit everything with "git commit -m \\"add password validation with tests\\""',
    'Push with "git push"',
  ],
};
