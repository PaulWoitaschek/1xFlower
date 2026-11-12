import {
  allKeys,
  stage,
  uid,
  type Critter,
  type CritterKind,
  type Garden,
} from "./garden";

const KINDS: CritterKind[] = ["bfly", "bee", "bfly", "bug"];
export const BUTTERFLY_COLORS = [
  "#7FC8F8",
  "#FF9EC4",
  "#FFC93C",
  "#B79CFF",
  "#FF9F43",
  "#6EE0B4",
];

// A visitor sits on a plant of its own, on a bloom if one is free.
export function newVisitor(
  garden: Garden,
  random = Math.random,
): Critter | null {
  const taken = new Set(garden.critters.map((c) => c.key));
  const free = allKeys().filter((key) => !taken.has(key));
  if (!free.length) return null;
  const blooms = free.filter((key) => stage(garden, key) === "l4");
  const buds = free.filter((key) => stage(garden, key) === "l3");
  const from = blooms.length ? blooms : buds.length ? buds : free;
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const critter: Critter = {
    id: uid(),
    kind: KINDS[garden.critters.length % KINDS.length],
    key: pick(from),
    color: pick(BUTTERFLY_COLORS),
  };
  garden.critters.push(critter);
  return critter;
}
