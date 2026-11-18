import type { Deco } from "../art/deco";
import {
  canGrow,
  factors,
  rowComplete,
  type Critter,
  type Fact,
  type Garden,
} from "./garden";
import { claimGifts } from "./gifts";
import type { Queue } from "./pick";
import { water } from "./thirst";
import { newVisitor } from "./visitors";

export const ROUND = 20;

export interface Round {
  /** number of tasks */
  size: number;
  /** a short round that asks only thirsty blooms */
  water: boolean;
  n: number;
  right: number;
  points: number;
  blooms: number;
  /** "tip": right at the second try, with a tip of the pond */
  marks: ("ok" | "bad" | "tip")[];
  missed: string[];
}

export const newRound = (size = ROUND, water = false): Round => ({
  size,
  water,
  n: 0,
  right: 0,
  points: 0,
  blooms: 0,
  marks: [],
  missed: [],
});

export interface Play extends Queue {
  streak: number;
  round: Round;
}

export const multiplier = (streak: number) =>
  streak >= 10 ? 3 : streak >= 5 ? 2 : 1;

export interface Right {
  right: true;
  points: number;
  fast: boolean;
  /** level of the plant before this answer */
  before: number;
  bloom: boolean;
  /** the plant did not grow, it rests until a later day */
  rest: boolean;
  rowDone: boolean;
  /** a wilted plant is green again */
  freshAgain: boolean;
  /** a thirsty bloom got its water */
  quenched: boolean;
  gift: Deco | null;
  visitor: Critter | null;
}

export interface Wrong {
  right: false;
}

// The task is asked: its fact counts one more time.
export function see(
  facts: Record<string, Fact>,
  play: Play,
  key: string,
): Fact {
  const fact = (facts[key] ||= {
    lvl: 0,
    seen: 0,
    right: 0,
    wrong: 0,
    wilt: false,
    grown: 0,
  });
  fact.seen++;
  play.round.n++;
  play.last = key;
  return fact;
}

// A wrong first answer: the plant wilts and the task comes back soon, two times.
export function miss(fact: Fact, play: Play, key: string): Wrong {
  fact.wrong++;
  fact.lvl = 0;
  fact.wilt = true;
  play.streak = 0;
  play.round.marks.push("bad");
  if (!play.round.missed.includes(key)) play.round.missed.push(key);
  play.comeback = play.comeback.filter((c) => c.key !== key);
  play.comeback.push({ key, due: play.qn + 2 }, { key, due: play.qn + 6 });
  return { right: false };
}

// A right first answer: the streak grows and brings points.
export function score(garden: Garden, play: Play, fast: boolean): number {
  play.streak++;
  garden.best = Math.max(garden.best, play.streak);
  const points = 10 * multiplier(play.streak) + (fast ? 5 : 0);
  garden.points += points;
  play.round.points += points;
  play.round.right++;
  play.round.marks.push("ok");
  return points;
}

// The first answer to a task. It changes the garden and the play state.
// today is the day of the answer, see dayOf.
export function answer(
  garden: Garden,
  play: Play,
  key: string,
  value: number,
  fast: boolean,
  today: number,
  random = Math.random,
): Right | Wrong {
  const [a, b] = factors(key);
  const fact = see(garden.facts, play, key);

  if (value !== a * b) return miss(fact, play, key);

  const before = fact.lvl;
  const wasWilt = fact.wilt;
  const grows = canGrow(fact, today);
  fact.right++;
  if (grows) {
    fact.lvl++;
    fact.grown = today;
  }
  if (fact.lvl >= 2) fact.wilt = false;
  const points = score(garden, play, fast);
  const bloom = before === 3 && fact.lvl === 4;
  if (bloom) play.round.blooms++;
  const quenched = fact.lvl === 4 && water(fact, today, bloom);
  return {
    right: true,
    points,
    fast,
    before,
    bloom,
    rest: !grows && before < 4,
    rowDone: bloom && rowComplete(garden, a),
    freshAgain: wasWilt && !fact.wilt,
    quenched,
    gift: bloom ? claimGifts(garden) : null,
    visitor: play.streak % 5 === 0 ? newVisitor(garden, random) : null,
  };
}
