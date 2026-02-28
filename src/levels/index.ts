// levels/index.ts — Level registry and loader

import type { Scenario } from './schema';
import { level1_01 } from './tier1/level-1-01';
import { level1_02 } from './tier1/level-1-02';
import { level1_03 } from './tier1/level-1-03';
import { level1_04 } from './tier1/level-1-04';
import { level1_05 } from './tier1/level-1-05';
import { level2_01 } from './tier2/level-2-01';
import { level2_02 } from './tier2/level-2-02';
import { level2_03 } from './tier2/level-2-03';
import { level2_04 } from './tier2/level-2-04';
import { level2_05 } from './tier2/level-2-05';
import { level3_01 } from './tier3/level-3-01';
import { level3_02 } from './tier3/level-3-02';
import { level3_03 } from './tier3/level-3-03';
import { level3_04 } from './tier3/level-3-04';
import { level3_05 } from './tier3/level-3-05';
import { level4_01 } from './tier4/level-4-01';
import { level4_02 } from './tier4/level-4-02';
import { level4_03 } from './tier4/level-4-03';
import { level4_04 } from './tier4/level-4-04';
import { level4_05 } from './tier4/level-4-05';

/** All available levels in play order */
export const ALL_LEVELS: Scenario[] = [
  level1_01,
  level1_02,
  level1_03,
  level1_04,
  level1_05,
  level2_01,
  level2_02,
  level2_03,
  level2_04,
  level2_05,
  level3_01,
  level3_02,
  level3_03,
  level3_04,
  level3_05,
  level4_01,
  level4_02,
  level4_03,
  level4_04,
  level4_05,
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
