// levels/tier2/level-2-03.ts — "Fast-Forward Merge"
// Concept: git checkout, git merge (fast-forward), git push

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const hash1 = generateHash('initial commit', [], 1000000);
const hash2 = generateHash('style navbar', [hash1], 1001000);
const hash3 = generateHash('add dark mode toggle', [hash2], 1002000);

export const level2_03: Scenario = {
  id: 'tier2-03-fast-forward-merge',
  tier: 2,
  title: 'Fast-Forward Merge',
  par: 3,

  startingState: {
    commits: {
      [hash1]: {
        hash: hash1,
        message: 'initial commit',
        parentHashes: [],
        tree: {
          'index.js': { content: 'import { Navbar } from "./navbar"' },
          'navbar.js': { content: 'export function Navbar() { return "nav" }' },
        },
        timestamp: 1000000,
      },
      [hash2]: {
        hash: hash2,
        message: 'style navbar',
        parentHashes: [hash1],
        tree: {
          'index.js': { content: 'import { Navbar } from "./navbar"' },
          'navbar.js': {
            content: 'export function Navbar() { return "styled nav" }',
          },
          'styles.css': { content: '.navbar { color: white; }' },
        },
        timestamp: 1001000,
      },
      [hash3]: {
        hash: hash3,
        message: 'add dark mode toggle',
        parentHashes: [hash2],
        tree: {
          'index.js': { content: 'import { Navbar } from "./navbar"' },
          'navbar.js': {
            content:
              'export function Navbar() { return "styled nav with dark mode" }',
          },
          'styles.css': {
            content:
              '.navbar { color: white; }\n.dark-mode { background: #1a1a1a; }',
          },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      main: hash1,
      develop: hash1,
      'feature/dark-mode': hash3,
    },
    head: { type: 'branch', name: 'feature/dark-mode' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: { main: hash1, develop: hash1 },
    },
    stash: [],
  },

  targetState: {
    branches: ['develop'],
    remoteBranches: ['develop'],
    head: { type: 'branch', name: 'develop' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'alex',
      text: "feature/dark-mode is ready to ship! can you merge it into develop and push? no conflicts, it branched off the tip so should be clean 👍",
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: 'nice, fast-forward! 🎉',
      trigger: { type: 'after_command', command: 'merge' },
    },
  ],

  hints: [
    'First switch to the develop branch with "git checkout develop"',
    'Then merge with "git merge feature/dark-mode"',
    'Finally push with "git push"',
  ],
};
