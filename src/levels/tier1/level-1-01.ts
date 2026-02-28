// levels/tier1/level-1-01.ts — "First Commit"
// Concept: git add, git commit, git push

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const initialHash = generateHash('initial project setup', [], 1000000);

export const level1_01: Scenario = {
  id: 'tier1-01-first-commit',
  tier: 1,
  title: 'First Commit',
  description: 'Stage a new file, commit it, and push to the remote.',
  concepts: ['add', 'commit', 'push'],
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
    },
    branches: { main: initialHash },
    head: { type: 'branch', name: 'main' },
    index: {},
    workingTree: {
      files: {
        'README.md': {
          status: 'untracked',
          content: '# Velo\nA cycling route tracker.',
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
  },

  slackThread: [
    {
      from: 'alex',
      text: "hey! can you add a README and push it? repo looks empty rn 😅",
      trigger: { type: 'level_start' },
    },
    {
      from: 'alex',
      text: "nice commit, don't forget to push! 🚀",
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Use "git add README.md" to stage the file',
    'Use "git commit -m \\"add README\\"" to create a commit',
    'Use "git push" to push to the remote',
  ],
};
