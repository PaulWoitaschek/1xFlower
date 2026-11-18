import type { Fact, Garden } from "./garden";
import { bloomCount } from "./garden";
import { farmOf, hayPatches } from "./farm";
import { openLilies, pondOf } from "./pond";
import type { Mode } from "./storage";

// The diary keeps each day of practice: the tasks of each mode and what
// blooms at the end of the day. The child gets stars for the tasks of a day,
// and the parents see the activity and the learning over time.

export interface Tally {
  /** the tasks, each counted at its first answer */
  n: number;
  /** the tasks that were right at the first answer */
  right: number;
  /** the time to think, in milliseconds */
  ms: number;
}

/** what blooms: the blooms of the garden, the hay of the farm, the open lilies of the pond */
export type Done = Record<Mode, number>;

export interface Day {
  garden?: Tally;
  farm?: Tally;
  pond?: Tally;
  /** what blooms at the last answer of the day */
  done?: Done;
}

export const MODES: Mode[] = ["garden", "farm", "pond"];

/** the tasks of a day that bring the first, second and third star */
export const STAR_TASKS = [10, 30, 50];

/** a task that takes longer counts with this time, the child took a break */
export const THINK_MAX = 60_000;

/** the days the diary keeps */
export const KEEP_DAYS = 400;

export const diaryOf = (garden: Garden) => (garden.days ||= {});

export function doneOf(garden: Garden): Done {
  return {
    garden: bloomCount(garden),
    farm: hayPatches(farmOf(garden)),
    pond: openLilies(pondOf(garden)),
  };
}

// The first answer to a task, after the rules changed the garden.
export function note(
  garden: Garden,
  mode: Mode,
  right: boolean,
  ms: number,
  today: number,
) {
  const days = diaryOf(garden);
  const day = (days[today] ||= {});
  const tally = (day[mode] ||= { n: 0, right: 0, ms: 0 });
  tally.n++;
  if (right) tally.right++;
  tally.ms += Math.round(Math.min(Math.max(ms, 0), THINK_MAX));
  day.done = doneOf(garden);
  for (const key of Object.keys(days)) {
    if (+key <= today - KEEP_DAYS) delete days[+key];
  }
}

export function tasksOf(day: Day | undefined): number {
  if (!day) return 0;
  return MODES.reduce((sum, mode) => sum + (day[mode]?.n || 0), 0);
}

export function rightOf(day: Day | undefined): number {
  if (!day) return 0;
  return MODES.reduce((sum, mode) => sum + (day[mode]?.right || 0), 0);
}

export function timeOf(day: Day | undefined): number {
  if (!day) return 0;
  return MODES.reduce((sum, mode) => sum + (day[mode]?.ms || 0), 0);
}

export function starsOf(day: Day | undefined): number {
  const tasks = tasksOf(day);
  return STAR_TASKS.filter((need) => tasks >= need).length;
}

export function totalStars(garden: Garden): number {
  return Object.values(garden.days || {}).reduce(
    (sum, day) => sum + starsOf(day),
    0,
  );
}

// The tasks that the child still needs today for the next star, 0 with all stars.
export function toNextStar(garden: Garden, today: number): number {
  const tasks = tasksOf(garden.days?.[today]);
  const need = STAR_TASKS.find((n) => tasks < n);
  return need ? need - tasks : 0;
}

// The days in a row with at least one star. A day without practice ends the
// row only when it is over: today still counts until midnight.
export function dayStreak(garden: Garden, today: number): number {
  const days = garden.days || {};
  let day = starsOf(days[today]) ? today : today - 1;
  let streak = 0;
  while (starsOf(days[day])) {
    streak++;
    day--;
  }
  return streak;
}

export interface Span {
  days: number;
  tasks: number;
  right: number;
  ms: number;
}

// The practice of the `count` days that end on `last`.
export function span(garden: Garden, last: number, count: number): Span {
  const out = { days: 0, tasks: 0, right: 0, ms: 0 };
  for (let day = last - count + 1; day <= last; day++) {
    const entry = garden.days?.[day];
    const tasks = tasksOf(entry);
    if (!tasks) continue;
    out.days++;
    out.tasks += tasks;
    out.right += rightOf(entry);
    out.ms += timeOf(entry);
  }
  return out;
}

// What bloomed on each of the `count` days that end on `today`. A day without
// practice keeps the value of the day before, and days before the first entry
// of the diary are null.
export function curve(
  garden: Garden,
  today: number,
  count: number,
): (Done | null)[] {
  const days = garden.days || {};
  const first = today - count + 1;
  // the last value before the first day of the curve
  const before = Object.keys(days)
    .map(Number)
    .filter((day) => day < first && days[day].done)
    .sort((x, y) => y - x)[0];
  let last: Done | null = before == null ? null : days[before].done!;
  const out = [];
  for (let day = first; day <= today; day++) {
    if (days[day]?.done) last = days[day].done!;
    out.push(last);
  }
  return out;
}

export function firstDay(garden: Garden): number | null {
  const keys = Object.keys(garden.days || {}).map(Number);
  return keys.length ? Math.min(...keys) : null;
}

export interface RowState {
  row: number;
  /** blooms or hay of the 10 tasks of the row */
  done: number;
  right: number;
  wrong: number;
}

// The tasks of a row: a × 1 … a × 10 in the garden, a : divisor on the farm.
export function rowState(
  facts: Record<string, Fact>,
  row: number,
  keys: string[],
): RowState {
  const out = { row, done: 0, right: 0, wrong: 0 };
  for (const key of keys) {
    const fact = facts[key];
    if (!fact) continue;
    if (fact.seen && !fact.wilt && fact.lvl >= 4) out.done++;
    out.right += fact.right;
    out.wrong += fact.wrong;
  }
  return out;
}

export interface Tricky {
  key: string;
  mode: Mode;
  wrong: number;
  seen: number;
  /** the child still gets it wrong: the plant is wilted */
  wilt: boolean;
}

// The tasks that went wrong most often, the wilted ones first.
export function tricky(garden: Garden, max = 8): Tricky[] {
  const all: Tricky[] = [];
  const add = (mode: Mode, facts: Record<string, Fact>) => {
    for (const [key, fact] of Object.entries(facts)) {
      if (fact.wrong > 0)
        all.push({
          key,
          mode,
          wrong: fact.wrong,
          seen: fact.seen,
          wilt: fact.wilt,
        });
    }
  };
  add("garden", garden.facts);
  if (garden.farm) add("farm", garden.farm.facts);
  if (garden.pond) add("pond", garden.pond.facts);
  return all
    .sort(
      (x, y) =>
        +y.wilt - +x.wilt ||
        y.wrong / y.seen - x.wrong / x.seen ||
        y.wrong - x.wrong,
    )
    .slice(0, max);
}
