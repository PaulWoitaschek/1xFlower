export interface Fact {
  lvl: number;
  seen: number;
  right: number;
  wrong: number;
  wilt: boolean;
  /** the day on which the plant last grew, see dayOf */
  grown: number;
}

export type CritterKind = "bfly" | "bee" | "bug";

export interface Critter {
  id: string;
  kind: CritterKind;
  key: string;
  color: string;
}

export interface Garden {
  facts: Record<string, Fact>;
  points: number;
  best: number;
  rows: number[];
  deco: string[];
  critters: Critter[];
}

export type Stage = "u" | "l0" | "l1" | "l2" | "l3" | "l4" | "wilt";

export function freshGarden(): Garden {
  return {
    facts: {},
    points: 0,
    best: 0,
    rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    deco: [],
    critters: [],
  };
}

export const keyOf = (a: number, b: number) => a + "x" + b;

export function factors(key: string): [number, number] {
  const [a, b] = key.split("x").map(Number);
  return [a, b];
}

export function allKeys(): string[] {
  const keys = [];
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) keys.push(keyOf(a, b));
  }
  return keys;
}

export function stage(garden: Garden, key: string): Stage {
  const fact = garden.facts[key];
  if (!fact || !fact.seen) return "u";
  return fact.wilt ? "wilt" : (("l" + fact.lvl) as Stage);
}

// The number of the calendar day in the local time zone.
export function dayOf(time: number): number {
  const date = new Date(time);
  const midnight = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return Math.round(midnight / 86_400_000);
}

// The days that a plant rests after it grew to a level. Short practice can not
// make a plant bloom: the bud and the bloom each come on a later day.
const REST = [0, 0, 1, 1];

export function canGrow(fact: Fact, today: number): boolean {
  return fact.lvl < 4 && today - fact.grown >= REST[fact.lvl];
}

export function bloomCount(garden: Garden): number {
  return Object.keys(garden.facts).filter((key) => stage(garden, key) === "l4")
    .length;
}

export function rowComplete(garden: Garden, row: number): boolean {
  for (let b = 1; b <= 10; b++) {
    if (stage(garden, keyOf(row, b)) !== "l4") return false;
  }
  return true;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// The plants in bloom right next to a plant, also across the corners.
export function bloomingNeighbours(garden: Garden, key: string): string[] {
  const [a, b] = factors(key);
  const found = [];
  for (let da = -1; da <= 1; da++) {
    for (let db = -1; db <= 1; db++) {
      const na = a + da;
      const nb = b + db;
      if ((!da && !db) || na < 1 || na > 10 || nb < 1 || nb > 10) continue;
      if (stage(garden, keyOf(na, nb)) === "l4") found.push(keyOf(na, nb));
    }
  }
  return found;
}

// Blooms draw bees and butterflies into the garden.
export function guests(blooms: number): { bees: number; butterflies: number } {
  return {
    bees: Math.min(6, Math.ceil(blooms / 5)),
    butterflies: Math.min(4, Math.floor(blooms / 8)),
  };
}
