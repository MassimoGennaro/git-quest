// levels/tier3/level-3-01.ts — "Merge Conflict"
// Concept: git merge with conflict, conflict picker, git add, git commit

import type { Scenario } from '../schema';
import { generateHash } from '@/engine/store';

const ancestorHash = generateHash('initial config', [], 1000000);
const oursHash = generateHash('fix retry logic', [ancestorHash], 1001000);
const theirsHash = generateHash(
  'update timeout to 5000',
  [ancestorHash],
  1002000,
);

export const level3_01: Scenario = {
  id: 'tier3-01-merge-conflict',
  tier: 3,
  title: 'Merge Conflict',
  par: 5,

  startingState: {
    commits: {
      [ancestorHash]: {
        hash: ancestorHash,
        message: 'initial config',
        parentHashes: [],
        tree: {
          'config.js': { content: 'timeout: 1000' },
          'index.js': { content: 'import config from "./config"' },
        },
        timestamp: 1000000,
      },
      [oursHash]: {
        hash: oursHash,
        message: 'fix retry logic',
        parentHashes: [ancestorHash],
        tree: {
          'config.js': { content: 'timeout: 3000' },
          'index.js': { content: 'import config from "./config"' },
        },
        timestamp: 1001000,
      },
      [theirsHash]: {
        hash: theirsHash,
        message: 'update timeout to 5000',
        parentHashes: [ancestorHash],
        tree: {
          'config.js': { content: 'timeout: 5000' },
          'index.js': { content: 'import config from "./config"' },
        },
        timestamp: 1002000,
      },
    },
    branches: {
      develop: oursHash,
      'feature/auth': theirsHash,
    },
    head: { type: 'branch', name: 'develop' },
    index: {},
    workingTree: { files: {} },
    remote: {
      name: 'origin',
      branches: {
        develop: oursHash,
        'feature/auth': theirsHash,
      },
    },
    stash: [],
  },

  targetState: {
    branches: ['develop'],
    head: { type: 'branch', name: 'develop' },
    workingTreeClean: true,
  },

  slackThread: [
    {
      from: 'sarah',
      text: "can you merge feature/auth into develop? heads up -- there's a conflict in config.js. the 5000ms timeout in feature/auth was a mistake, keep the develop value (3000).",
      trigger: { type: 'level_start' },
    },
    {
      from: 'sarah',
      text: 'yep, there it is. remember: keep the develop version of the timeout. then git add and commit to finish the merge.',
      trigger: { type: 'conflict_triggered' },
    },
    {
      from: 'alex',
      text: 'merged! thanks 🙌',
      trigger: { type: 'after_commit' },
    },
  ],

  hints: [
    'Run "git merge feature/auth" to start the merge',
    'Use the conflict picker to keep "ours" (develop) version — timeout: 3000',
    'Stage the resolved file with "git add config.js"',
    'Complete the merge with "git commit"',
  ],
};
