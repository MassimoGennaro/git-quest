// levels/tier4/level-4-01.ts — "The Cleanup" (placeholder)
// Concept: git rebase -i (squash) — not yet implemented in engine
// This level is a placeholder that will be fully playable once rebase is added

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const setupHash = generateHash('setup', [], 1000000);
const hash2 = generateHash('add profile route', [setupHash], 1001000);
const hash3 = generateHash('wip: profile page', [hash2], 1002000);
const hash4 = generateHash('fix another typo', [hash3], 1003000);
const hash5 = generateHash('fix typo', [hash4], 1004000);

export const level4_01: Scenario = {
  id: 'tier4-01-the-cleanup',
  tier: 4,
  title: 'The Cleanup',
  description: 'Squash messy WIP commits into one clean commit using interactive rebase.',
  concepts: ['rebase -i', 'squash'],
  par: 4,

  startingState: {
    commits: {
      [setupHash]: {
        hash: setupHash,
        message: 'setup',
        parentHashes: [],
        tree: {
          'index.js': { content: 'import express from "express"' },
          'routes.js': { content: 'export const routes = []' },
        },
        timestamp: 1000000,
      },
      [hash2]: {
        hash: hash2,
        message: 'add profile route',
        parentHashes: [setupHash],
        tree: {
          'index.js': { content: 'import express from "express"' },
          'routes.js': {
            content: 'export const routes = ["/profile"]',
          },
          'profile.js': { content: 'export function profile() {}' },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'wip: profile page',
        parentHashes: [hash2],
        tree: {
          'index.js': { content: 'import express from "express"' },
          'routes.js': {
            content: 'export const routes = ["/profile"]',
          },
          'profile.js': {
            content:
              'export function profile() {\n  return { name: "User", bio: "" }\n}',
          },
        },
        timestamp: 1002000,
      },
      [hash4]: {
        hash: hash4,
        message: 'fix another typo',
        parentHashes: [hash3],
        tree: {
          'index.js': { content: 'import express from "express"' },
          'routes.js': {
            content: 'export const routes = ["/profile"]',
          },
          'profile.js': {
            content:
              'export function profile() {\n  return { name: "User", bio: "Hello" }\n}',
          },
        },
        timestamp: 1003000,
      },
      [hash5]: {
        hash: hash5,
        message: 'fix typo',
        parentHashes: [hash4],
        tree: {
          'index.js': { content: 'import express from "express"' },
          'routes.js': {
            content: 'export const routes = ["/profile"]',
          },
          'profile.js': {
            content:
              'export function profile() {\n  return { name: "User", bio: "Hello world" }\n}',
          },
        },
        timestamp: 1004000,
      },
    },
    branches: {
      main: setupHash,
      develop: setupHash,
      'feature/user-profile': hash5,
    },
    head: { type: 'branch', name: 'feature/user-profile' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: {
        main: setupHash,
        develop: setupHash,
      },
    },
    stash: [],
    reflog: [],
  },

  targetState: {
    branches: ['feature/user-profile'],
    head: { type: 'branch', name: 'feature/user-profile' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'marcus',
      text: 'before you open the PR, squash those commits on feature/user-profile. 4 commits for one feature is noise. make it one clean commit.',
      trigger: { type: 'level_start' },
    },
    {
      from: 'marcus',
      text: 'better.',
      trigger: { type: 'after_command', command: 'rebase' },
    },
  ],

  hints: [
    'Use "git rebase -i HEAD~4" to start an interactive rebase',
    'Squash all commits into one clean commit',
    'The UI will show a picker — squash the last 3 into the first',
  ],
};
