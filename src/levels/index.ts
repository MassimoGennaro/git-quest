// levels/index.ts — Level registry and loader

import type { Scenario } from './schema';
import { level1_01 } from './tier1/level-1-01';
import { level2_03 } from './tier2/level-2-03';
import { level3_01 } from './tier3/level-3-01';
import { level4_01 } from './tier4/level-4-01';

/** All available levels in play order */
export const ALL_LEVELS: Scenario[] = [
  level1_01,
  level2_03,
  level3_01,
  level4_01,
];

/** Look up a scenario by its unique id */
export function loadScenario(id: string): Scenario | undefined {
  return ALL_LEVELS.find((s) => s.id === id);
}

/** Get the next level after the given id, or undefined if at the end */
export function getNextLevel(currentId: string): Scenario | undefined {
  const idx = ALL_LEVELS.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx >= ALL_LEVELS.length - 1) return undefined;
  return ALL_LEVELS[idx + 1];
}
