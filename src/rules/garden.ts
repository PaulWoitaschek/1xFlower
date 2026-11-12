export interface Fact {
  lvl: number;
  seen: number;
  right: number;
  wrong: number;
  wilt: boolean;
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
