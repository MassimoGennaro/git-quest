// engine/commands/reflog.ts — git reflog command handler

import type { CommandHandler } from '../types';

/**
 * git reflog — show the reference log (history of HEAD movements)
 *
 * Displays entries in the format:
 *   <short-hash> HEAD@{N}: <description>
 */
export const reflog: CommandHandler = (_args, _flags, state) => {
  if (state.reflog.length === 0) {
    return {
      success: true,
      output: 'No reflog entries.',
      newState: state,
    };
  }

  const lines = state.reflog.map(
    (entry, i) =>
      `${entry.hash.slice(0, 7)} HEAD@{${i}}: ${entry.description}`,
  );

  return {
    success: true,
    output: lines.join('\n'),
    newState: state,
  };
};
