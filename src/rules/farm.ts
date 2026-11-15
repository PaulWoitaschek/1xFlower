import { miss, score, see, type Play, type Wrong } from "./answer";
import {
  allKeys,
  factors,
  stage,
  uid,
  type Fact,
  type Garden,
  type Stage,
} from "./garden";
import { pickWeighted, type Queue } from "./pick";

// The farm practices the division. Each task is a patch of meadow: a right
// answer lets the grass grow, and the high grass becomes hay. The hay and the
// blooms of the garden feed the chickens, and the hens lay eggs.

export interface Egg {
  id: string;
  /** right answers that warmed the egg, see EGG_WARMTH */
  warmth: number;
}

export interface Chicken {
  id: string;
  /** index into the chicken colors */
  color: number;
  /** a chick until it ate CHICK_MEALS times */
  grown: boolean;
  /** meals since it grew up or since its last egg */
  meals: number;
}

export interface Farm {
  facts: Record<string, Fact>;
  /** the divisors to practice */
  rows: number[];
  /** hay bales in the barn */
  hay: number;
  /** the eggs in the nest, the first one is warmed */
  eggs: Egg[];
  chickens: Chicken[];
}

/** right answers that hatch an egg */
export const EGG_WARMTH = 6;
/** meals that make a chick a hen */
export const CHICK_MEALS = 3;
/** meals after which a hen lays an egg */
export const LAY_MEALS = 2;
export const NEST_MAX = 3;
/** the most chickens and eggs together */
export const FLOCK_MAX = 12;
export const CHICKEN_COLORS = 5;
/** the hay in the barn of a new farm, so that the first chick can eat soon */
export const START_HAY = 2;
/** the first rows of the division in school */
export const FARM_ROWS = [2, 5, 10];

// The task dividend : divisor = quotient, as in "56:8".
export const divKey = (divisor: number, quotient: number) =>
  divisor * quotient + ":" + divisor;

export function divParts(key: string): [dividend: number, divisor: number] {
  const [dividend, divisor] = key.split(":").map(Number);
  return [dividend, divisor];
}

export const quotientOf = (key: string) => {
  const [dividend, divisor] = divParts(key);
  return dividend / divisor;
};

export function freshFarm(): Farm {
  return {
    facts: {},
    rows: [...FARM_ROWS],
    hay: START_HAY,
    eggs: [{ id: uid(), warmth: 0 }],
    chickens: [],
  };
}

// Gardens saved before the farm existed get a new farm on the first visit.
export function farmOf(garden: Garden): Farm {
  return (garden.farm ||= freshFarm());
}

// The divisor is the row, the quotient the column.
export function farmPool(rows: number[]): string[] {
  const keys = [];
  for (const divisor of rows) {
    for (let q = 1; q <= 10; q++) keys.push(divKey(divisor, q));
  }
  return keys;
}

export function allPatches(): string[] {
  return farmPool([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
}

export function patchStage(farm: Farm, key: string): Stage {
  const fact = farm.facts[key];
  if (!fact || !fact.seen) return "u";
  return fact.wilt ? "wilt" : (("l" + fact.lvl) as Stage);
}

export function hayPatches(farm: Farm): number {
  return Object.keys(farm.facts).filter((key) => patchStage(farm, key) === "l4")
    .length;
}

export function rowHay(farm: Farm, divisor: number): boolean {
  return farmPool([divisor]).every((key) => patchStage(farm, key) === "l4");
}

// Grass that grows comes more often than new patches, so that the first hay comes soon.
export function farmWeight(fact: Fact | undefined): number {
  if (!fact || !fact.seen) return 2.5;
  if (fact.wilt) return 12 + Math.min(fact.wrong, 5) * 2;
  return fact.lvl >= 4 ? 0.5 : 6;
}

export function pickFarm(farm: Farm, queue: Queue, random = Math.random) {
  return pickWeighted(
    farmPool(farm.rows),
    queue,
    (key) => farmWeight(farm.facts[key]),
    random,
  );
}

/** 0 a fresh egg, 1 it wobbles, 2 it cracks, 3 the chick looks out */
export const eggStage = (egg: Egg) =>
  Math.min(3, Math.floor((egg.warmth * 4) / EGG_WARMTH));

export const roomForEgg = (farm: Farm) =>
  farm.eggs.length < NEST_MAX &&
  farm.eggs.length + farm.chickens.length < FLOCK_MAX;

// A hen that ate enough lays its egg when the nest has room.
function lay(farm: Farm, hen: Chicken): boolean {
  if (!hen.grown || hen.meals < LAY_MEALS || !roomForEgg(farm)) return false;
  hen.meals = 0;
  farm.eggs.push({ id: uid(), warmth: 0 });
  return true;
}

// A right answer warms the first egg. A warm egg hatches a chick.
export function warmEgg(farm: Farm, random = Math.random): Chicken | null {
  const egg = farm.eggs[0];
  if (!egg) return null;
  egg.warmth++;
  if (egg.warmth < EGG_WARMTH) return null;
  farm.eggs.shift();
  const chick: Chicken = {
    id: uid(),
    color: Math.floor(random() * CHICKEN_COLORS),
    grown: false,
    meals: 0,
  };
  farm.chickens.push(chick);
  // a hen that waited for room in the nest lays now
  for (const hen of farm.chickens) if (lay(farm, hen)) break;
  return chick;
}

// A hen that ate enough and waits for room in the nest does not eat.
export const full = (farm: Farm, c: Chicken) =>
  c.grown && c.meals >= LAY_MEALS && !roomForEgg(farm);

export interface Meal {
  /** the chick is a hen now */
  grown: boolean;
  /** the hen laid an egg */
  egg: boolean;
}

function eat(farm: Farm, c: Chicken): Meal {
  c.meals++;
  if (!c.grown) {
    if (c.meals < CHICK_MEALS) return { grown: false, egg: false };
    c.grown = true;
    c.meals = 0;
    return { grown: true, egg: false };
  }
  c.meals = Math.min(c.meals, LAY_MEALS);
  return { grown: false, egg: lay(farm, c) };
}

export function feedHay(farm: Farm, id: string): Meal | null {
  const c = farm.chickens.find((c) => c.id === id);
  if (!c || farm.hay < 1 || full(farm, c)) return null;
  farm.hay--;
  return eat(farm, c);
}

// The blooms of the garden that a chicken can eat.
export function feedableBlooms(garden: Garden): string[] {
  return allKeys().filter((key) => stage(garden, key) === "l4");
}

// A chicken eats the bloom a × b when the child knows (a × b) : a.
export function flowerTask(flowerKey: string): string {
  const [a, b] = factors(flowerKey);
  return divKey(a, b);
}

// The eaten bloom grows again from a leafy plant. Two right answers on two
// later days make it bloom again, so that the child repeats the fact.
export function feedFlower(
  garden: Garden,
  id: string,
  flowerKey: string,
  today: number,
): Meal | null {
  const farm = farmOf(garden);
  const c = farm.chickens.find((c) => c.id === id);
  if (!c || full(farm, c) || stage(garden, flowerKey) !== "l4") return null;
  const fact = garden.facts[flowerKey];
  fact.lvl = 2;
  fact.grown = today;
  delete fact.watered;
  delete fact.gap;
  return eat(farm, c);
}

export interface FarmRight {
  right: true;
  points: number;
  fast: boolean;
  /** level of the patch before this answer */
  before: number;
  /** a hay bale went into the barn */
  bale: boolean;
  /** the patch became hay with this answer */
  newHay: boolean;
  /** the whole row is hay now */
  rowDone: boolean;
  /** dry grass is green again */
  freshAgain: boolean;
  /** an egg got warmer */
  warmed: boolean;
  hatched: Chicken | null;
}

// The first answer to a division task. Grass grows by one level on each right
// answer. Each right answer on high grass brings a hay bale.
export function answerFarm(
  garden: Garden,
  play: Play,
  key: string,
  value: number,
  fast: boolean,
  random = Math.random,
): FarmRight | Wrong {
  const farm = farmOf(garden);
  const fact = see(farm.facts, play, key);
  if (value !== quotientOf(key)) return miss(fact, play, key);

  const before = fact.lvl;
  const wasWilt = fact.wilt;
  fact.right++;
  fact.lvl = Math.min(4, fact.lvl + 1);
  if (fact.lvl >= 2) fact.wilt = false;
  const points = score(garden, play, fast);
  const bale = fact.lvl === 4;
  if (bale) farm.hay++;
  const newHay = bale && before === 3;
  const warmed = farm.eggs.length > 0;
  return {
    right: true,
    points,
    fast,
    before,
    bale,
    newHay,
    rowDone: newHay && rowHay(farm, divParts(key)[1]),
    freshAgain: wasWilt && !fact.wilt,
    warmed,
    hatched: warmEgg(farm, random),
  };
}
