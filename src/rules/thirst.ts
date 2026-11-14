import type { Fact, Garden } from "./garden";
import { pool } from "./pick";

/** days a bloom stays fresh; each watering moves it to the next gap */
export const GAPS = [1, 3, 7, 14];
/** the most blooms in one watering round */
export const WATER_MAX = 10;
/** fewer thirsty blooms come first in a normal round */
export const WATER_MIN = 3;

// A bloom gets thirsty some days after its last right answer. today is a day, see dayOf.
export function thirsty(fact: Fact | undefined, today: number): boolean {
  if (!fact || fact.wilt || fact.lvl < 4 || fact.watered == null) return false;
  return today - fact.watered >= GAPS[fact.gap ?? 0];
}

// Only practiced rows count, so that a row that is switched off does not nag.
export function thirstyKeys(garden: Garden, today: number): string[] {
  return pool(garden.rows).filter((key) => thirsty(garden.facts[key], today));
}

export function waterQueue(
  garden: Garden,
  today: number,
  random = Math.random,
): string[] {
  const keys = thirstyKeys(garden, today);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys.slice(0, WATER_MAX);
}

// The bloom got a right answer. A thirsty bloom is watered and stays fresh for longer.
export function water(fact: Fact, today: number, bloomedNow: boolean): boolean {
  const watered = !bloomedNow && thirsty(fact, today);
  if (bloomedNow) fact.gap = 0;
  else if (watered) fact.gap = Math.min((fact.gap ?? 0) + 1, GAPS.length - 1);
  fact.watered = today;
  return watered;
}

// Blooms from before the thirst existed get thirsty bit by bit, not all on one day.
export function stampBlooms(garden: Garden, today: number) {
  const old = Object.keys(garden.facts)
    .filter((key) => {
      const fact = garden.facts[key];
      return fact.lvl === 4 && !fact.wilt && fact.watered == null;
    })
    .sort();
  old.forEach((key, i) => {
    garden.facts[key].watered = today;
    garden.facts[key].gap = i % GAPS.length;
  });
}
