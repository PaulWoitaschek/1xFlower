import { describe, expect, it } from "vitest";
import { gardenWith } from "./fixtures";
import { freshGarden } from "./garden";
import { pickNext, pool, weight, type Queue } from "./pick";

const DAY = 20_000;

const queue = (changes: Partial<Queue> = {}): Queue => ({
  qn: 1,
  last: null,
  comeback: [],
  ...changes,
});

describe("weight", () => {
  it("makes a wilted plant the most likely task", () => {
    const wilted = {
      lvl: 0,
      seen: 3,
      right: 1,
      wrong: 2,
      wilt: true,
      grown: 0,
    };
    expect(weight(wilted, DAY)).toBe(16);
    expect(weight({ ...wilted, wrong: 9 }, DAY)).toBe(22);
  });

  it("makes a task rarer with each level", () => {
    const levels = [0, 1, 2, 3, 4].map((lvl) =>
      weight(
        { lvl, seen: 1, right: lvl, wrong: 0, wilt: false, grown: 0 },
        DAY,
      ),
    );
    expect(levels).toEqual([7, 5, 3, 1.4, 0.5]);
  });

  it("makes a plant rare on the day it can not grow", () => {
    const bud = { lvl: 3, seen: 3, right: 3, wrong: 0, wilt: false };
    expect(weight({ ...bud, grown: DAY }, DAY)).toBe(0.5);
    expect(weight({ ...bud, grown: DAY - 1 }, DAY)).toBe(1.4);
    const young = { ...bud, lvl: 1, grown: DAY };
    expect(weight(young, DAY)).toBe(5);
  });

  it("gives a new task a middle weight", () => {
    expect(weight(undefined, DAY)).toBe(2.5);
  });
});

describe("pool", () => {
  it("has the ten tasks of each practiced row", () => {
    expect(pool([3, 7])).toHaveLength(20);
    expect(pool([3, 7])).toContain("7x10");
    expect(pool([3, 7])).not.toContain("4x1");
  });
});

describe("pickNext", () => {
  it("asks only tasks of the practiced rows", () => {
    const garden = freshGarden();
    garden.rows = [6];
    for (const random of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickNext(garden, queue(), DAY, () => random)).toMatch(/^6x/);
    }
  });

  it("picks by weight", () => {
    const garden = gardenWith({ "6x1": 0, "6x2": 4 });
    garden.rows = [6];
    garden.facts["6x1"].wilt = true;
    garden.facts["6x1"].wrong = 1;
    // weights: 6x1 has 14, 6x2 has 0.5, the eight new tasks have 2.5 each
    expect(pickNext(garden, queue(), DAY, () => 13.9 / 34.5)).toBe("6x1");
    expect(pickNext(garden, queue(), DAY, () => 14.1 / 34.5)).toBe("6x2");
    expect(pickNext(garden, queue(), DAY, () => 14.6 / 34.5)).toBe("6x3");
  });

  it("does not ask the same task two times in a row", () => {
    const garden = freshGarden();
    garden.rows = [6];
    expect(pickNext(garden, queue({ last: "6x1" }), DAY, () => 0)).toBe("6x2");
  });

  it("brings a task with an error back when it is due", () => {
    const garden = freshGarden();
    const waiting = queue({ qn: 4, comeback: [{ key: "7x8", due: 5 }] });
    expect(pickNext(garden, waiting, DAY, () => 0)).toBe("1x1");
    waiting.qn = 5;
    expect(pickNext(garden, waiting, DAY, () => 0)).toBe("7x8");
    expect(waiting.comeback).toEqual([]);
  });

  it("holds a due task back when it was the last task", () => {
    const garden = freshGarden();
    const waiting = queue({
      qn: 5,
      last: "7x8",
      comeback: [{ key: "7x8", due: 5 }],
    });
    expect(pickNext(garden, waiting, DAY, () => 0)).toBe("1x1");
    expect(waiting.comeback).toHaveLength(1);
  });

  it("holds a due task back when its row is not practiced", () => {
    const garden = freshGarden();
    garden.rows = [2];
    const waiting = queue({ qn: 5, comeback: [{ key: "7x8", due: 5 }] });
    expect(pickNext(garden, waiting, DAY, () => 0)).toBe("2x1");
  });
});
