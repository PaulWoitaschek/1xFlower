import type { Deco } from "../art/deco";
import {
  canGrow,
  factors,
  rowComplete,
  type Critter,
  type Garden,
} from "./garden";
import { claimGifts } from "./gifts";
import type { Queue } from "./pick";
import { newVisitor } from "./visitors";

export const ROUND = 20;

export interface Round {
  n: number;
  right: number;
  points: number;
  blooms: number;
  marks: ("ok" | "bad")[];
  missed: string[];
}

export const newRound = (): Round => ({
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
  gift: Deco | null;
  visitor: Critter | null;
}

export interface Wrong {
  right: false;
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
  const fact = (garden.facts[key] ||= {
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

  if (value !== a * b) {
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

  const before = fact.lvl;
  const wasWilt = fact.wilt;
  const grows = canGrow(fact, today);
  fact.right++;
  if (grows) {
    fact.lvl++;
    fact.grown = today;
  }
  if (fact.lvl >= 2) fact.wilt = false;
  play.streak++;
  garden.best = Math.max(garden.best, play.streak);
  const points = 10 * multiplier(play.streak) + (fast ? 5 : 0);
  garden.points += points;
  play.round.points += points;
  play.round.right++;
  play.round.marks.push("ok");
  const bloom = before === 3 && fact.lvl === 4;
  if (bloom) play.round.blooms++;
  return {
    right: true,
    points,
    fast,
    before,
    bloom,
    rest: !grows && before < 4,
    rowDone: bloom && rowComplete(garden, a),
    freshAgain: wasWilt && !fact.wilt,
    gift: bloom ? claimGifts(garden) : null,
    visitor: play.streak % 5 === 0 ? newVisitor(garden, random) : null,
  };
}
