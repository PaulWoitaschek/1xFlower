import { describe, expect, it } from "vitest";
import {
  curve,
  dayStreak,
  firstDay,
  KEEP_DAYS,
  note,
  rowState,
  span,
  starsOf,
  THINK_MAX,
  toNextStar,
  totalStars,
  tricky,
} from "./diary";
import { divKey, farmOf } from "./farm";
import { gardenWith, row } from "./fixtures";
import { freshGarden, keyOf, type Garden } from "./garden";
import { pondOf } from "./pond";

const DAY = 20_000;

// `tasks` first answers on `day`, all right in the garden.
function practise(garden: Garden, day: number, tasks: number, right = tasks) {
  for (let i = 0; i < tasks; i++) note(garden, "garden", i < right, 2000, day);
}

describe("note", () => {
  it("counts the tasks, the right ones and the time of each mode", () => {
    const garden = freshGarden();
    note(garden, "garden", true, 3000, DAY);
    note(garden, "garden", false, 5000, DAY);
    note(garden, "pond", true, 9000, DAY);

    expect(garden.days![DAY].garden).toEqual({ n: 2, right: 1, ms: 8000 });
    expect(garden.days![DAY].pond).toEqual({ n: 1, right: 1, ms: 9000 });
    expect(garden.days![DAY].farm).toBeUndefined();
  });

  it("counts a long break only with the longest time to think", () => {
    const garden = freshGarden();
    note(garden, "farm", true, 10 * 60_000, DAY);
    expect(garden.days![DAY].farm!.ms).toBe(THINK_MAX);
  });

  it("keeps what blooms at the last answer of the day", () => {
    const garden = gardenWith(row(2, 4));
    farmOf(garden).facts[divKey(5, 3)] = {
      lvl: 4,
      seen: 4,
      right: 4,
      wrong: 0,
      wilt: false,
      grown: 0,
    };
    note(garden, "garden", true, 1000, DAY);
    expect(garden.days![DAY].done).toEqual({ garden: 10, farm: 1, pond: 0 });
  });

  it("forgets the days that are too old", () => {
    const garden = freshGarden();
    practise(garden, DAY, 1);
    practise(garden, DAY + KEEP_DAYS - 1, 1);
    expect(firstDay(garden)).toBe(DAY);
    practise(garden, DAY + KEEP_DAYS, 1);
    expect(firstDay(garden)).toBe(DAY + KEEP_DAYS - 1);
  });

  it("works with the days of a saved garden, whose keys are strings", () => {
    const garden = JSON.parse(
      JSON.stringify({ ...freshGarden(), days: { [DAY]: {} } }),
    );
    practise(garden, DAY, 3);
    expect(garden.days[String(DAY)].garden.n).toBe(3);
  });
});

describe("stars", () => {
  it("gives a star for 10, 30 and 50 tasks of a day", () => {
    const garden = freshGarden();
    const starsAfter = (tasks: number) => {
      const g = freshGarden();
      practise(g, DAY, tasks);
      return starsOf(g.days![DAY]);
    };
    expect(starsAfter(9)).toBe(0);
    expect(starsAfter(10)).toBe(1);
    expect(starsAfter(30)).toBe(2);
    expect(starsAfter(80)).toBe(3);
    expect(starsOf(garden.days?.[DAY])).toBe(0);
  });

  it("counts wrong answers too, the practice counts", () => {
    const garden = freshGarden();
    practise(garden, DAY, 10, 0);
    expect(starsOf(garden.days![DAY])).toBe(1);
  });

  it("adds the stars of all days and of all modes", () => {
    const garden = freshGarden();
    practise(garden, DAY, 30);
    for (let i = 0; i < 10; i++) note(garden, "pond", true, 1000, DAY + 1);
    expect(totalStars(garden)).toBe(3);
  });

  it("tells the tasks to the next star of today", () => {
    const garden = freshGarden();
    expect(toNextStar(garden, DAY)).toBe(10);
    practise(garden, DAY, 12);
    expect(toNextStar(garden, DAY)).toBe(18);
    practise(garden, DAY, 40);
    expect(toNextStar(garden, DAY)).toBe(0);
  });
});

describe("dayStreak", () => {
  it("counts the days in a row with a star", () => {
    const garden = freshGarden();
    practise(garden, DAY - 3, 10);
    practise(garden, DAY - 1, 10);
    practise(garden, DAY, 10);
    expect(dayStreak(garden, DAY)).toBe(2);
  });

  it("keeps the streak of yesterday until today is over", () => {
    const garden = freshGarden();
    practise(garden, DAY - 2, 10);
    practise(garden, DAY - 1, 10);
    expect(dayStreak(garden, DAY)).toBe(2);
    expect(dayStreak(garden, DAY + 1)).toBe(0);
  });

  it("needs a star, a few tasks are not enough", () => {
    const garden = freshGarden();
    practise(garden, DAY, 5);
    expect(dayStreak(garden, DAY)).toBe(0);
  });
});

describe("span", () => {
  it("adds the days with practice", () => {
    const garden = freshGarden();
    practise(garden, DAY - 7, 20);
    practise(garden, DAY - 2, 20, 15);
    practise(garden, DAY, 4, 4);
    expect(span(garden, DAY, 7)).toEqual({
      days: 2,
      tasks: 24,
      right: 19,
      ms: 48_000,
    });
  });
});

describe("curve", () => {
  it("carries the last value over days without practice", () => {
    const garden = gardenWith(row(3, 4));
    note(garden, "garden", true, 1000, DAY - 1);
    garden.facts[keyOf(4, 1)] = { ...garden.facts[keyOf(3, 1)] };
    note(garden, "garden", true, 1000, DAY + 1);
    const points = curve(garden, DAY + 2, 5);
    expect(points.map((p) => p?.garden ?? null)).toEqual([
      null,
      10,
      10,
      11,
      11,
    ]);
  });

  it("starts with the last day before the curve", () => {
    const garden = gardenWith(row(3, 4));
    note(garden, "garden", true, 1000, DAY - 30);
    expect(curve(garden, DAY, 2)).toEqual([
      { garden: 10, farm: 0, pond: 0 },
      { garden: 10, farm: 0, pond: 0 },
    ]);
  });
});

describe("rowState", () => {
  it("counts the blooms and the answers of a row", () => {
    const garden = gardenWith({ ...row(7, 4), "7x8": 2 });
    garden.facts["7x8"].wrong = 3;
    garden.facts["7x9"].wilt = true;
    const keys = Array.from({ length: 10 }, (_, i) => keyOf(7, i + 1));
    expect(rowState(garden.facts, 7, keys)).toEqual({
      row: 7,
      done: 8,
      right: 38,
      wrong: 3,
    });
  });
});

describe("tricky", () => {
  it("lists the wilted tasks first, then the ones wrong most often", () => {
    const garden = gardenWith({ "7x8": 0, "6x7": 3, "3x4": 2 });
    Object.assign(garden.facts["7x8"], { seen: 5, wrong: 1, wilt: true });
    Object.assign(garden.facts["6x7"], { seen: 4, wrong: 3 });
    Object.assign(garden.facts["3x4"], { seen: 10, wrong: 3 });
    pondOf(garden).facts["Fahrrad"] = {
      lvl: 0,
      seen: 2,
      right: 0,
      wrong: 2,
      wilt: true,
      grown: 0,
    };
    expect(tricky(garden).map((t) => t.key)).toEqual([
      "Fahrrad",
      "7x8",
      "6x7",
      "3x4",
    ]);
  });

  it("leaves out the tasks without errors", () => {
    expect(tricky(gardenWith(row(2, 4)))).toEqual([]);
  });
});
