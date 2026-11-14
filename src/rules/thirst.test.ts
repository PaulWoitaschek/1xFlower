import { describe, expect, it } from "vitest";
import { gardenWith, row } from "./fixtures";
import type { Fact, Garden } from "./garden";
import { stampBlooms, thirsty, thirstyKeys, water, waterQueue } from "./thirst";

const DAY = 20_000;

const bloom = (changes: Partial<Fact> = {}): Fact => ({
  lvl: 4,
  seen: 4,
  right: 4,
  wrong: 0,
  wilt: false,
  grown: DAY,
  watered: DAY,
  gap: 0,
  ...changes,
});

// A garden in which each given task bloomed on DAY.
function blooms(...keys: string[]): Garden {
  const garden = gardenWith({});
  for (const key of keys) garden.facts[key] = bloom();
  return garden;
}

describe("thirsty", () => {
  it("makes a new bloom thirsty the next day", () => {
    expect(thirsty(bloom(), DAY)).toBe(false);
    expect(thirsty(bloom(), DAY + 1)).toBe(true);
  });

  it("keeps a bloom fresh for 3, 7 and 14 days after each watering", () => {
    expect(thirsty(bloom({ gap: 1 }), DAY + 2)).toBe(false);
    expect(thirsty(bloom({ gap: 1 }), DAY + 3)).toBe(true);
    expect(thirsty(bloom({ gap: 2 }), DAY + 6)).toBe(false);
    expect(thirsty(bloom({ gap: 2 }), DAY + 7)).toBe(true);
    expect(thirsty(bloom({ gap: 3 }), DAY + 13)).toBe(false);
    expect(thirsty(bloom({ gap: 3 }), DAY + 14)).toBe(true);
  });

  it("is only for blooms", () => {
    expect(thirsty(undefined, DAY + 30)).toBe(false);
    expect(thirsty(bloom({ lvl: 3 }), DAY + 30)).toBe(false);
    expect(thirsty(bloom({ lvl: 0, wilt: true }), DAY + 30)).toBe(false);
  });

  it("is not for a bloom without a day", () => {
    expect(thirsty(bloom({ watered: undefined }), DAY + 30)).toBe(false);
  });

  it("is not for a day before the last answer", () => {
    expect(thirsty(bloom(), DAY - 5)).toBe(false);
  });
});

describe("thirstyKeys", () => {
  it("has only blooms of the practiced rows", () => {
    const garden = blooms("3x4", "7x8");
    garden.rows = [7];
    expect(thirstyKeys(garden, DAY + 1)).toEqual(["7x8"]);
    expect(thirstyKeys(garden, DAY)).toEqual([]);
  });
});

describe("waterQueue", () => {
  it("has at most 10 thirsty blooms", () => {
    const garden = gardenWith({ ...row(3, 4), ...row(7, 4) });
    for (const key in garden.facts) garden.facts[key] = bloom();
    const queue = waterQueue(garden, DAY + 1, () => 0.5);
    expect(queue).toHaveLength(10);
    expect(new Set(queue).size).toBe(10);
  });

  it("mixes the blooms", () => {
    const garden = blooms("3x1", "3x2", "3x3");
    expect(waterQueue(garden, DAY + 1, () => 0)).toEqual(["3x2", "3x3", "3x1"]);
    expect(waterQueue(garden, DAY + 1, () => 0.999)).toEqual([
      "3x1",
      "3x2",
      "3x3",
    ]);
  });
});

describe("water", () => {
  it("stays at 14 days after the last step", () => {
    const fact = bloom({ gap: 3 });
    expect(water(fact, DAY + 14, false)).toBe(true);
    expect(fact).toMatchObject({ watered: DAY + 14, gap: 3 });
  });

  it("does not count a new bloom as watered", () => {
    const fact = bloom({ gap: 2 });
    expect(water(fact, DAY + 30, true)).toBe(false);
    expect(fact).toMatchObject({ watered: DAY + 30, gap: 0 });
  });
});

describe("stampBlooms", () => {
  it("spreads old blooms over the four times", () => {
    const garden = gardenWith(row(3, 4));
    stampBlooms(garden, DAY);
    expect(thirstyKeys(garden, DAY + 1)).toEqual(["3x1", "3x4", "3x8"]);
    expect(thirstyKeys(garden, DAY + 3)).toHaveLength(6);
    expect(thirstyKeys(garden, DAY + 7)).toHaveLength(8);
    expect(thirstyKeys(garden, DAY + 14)).toHaveLength(10);
  });

  it("leaves a bloom with a day as it is", () => {
    const garden = blooms("3x1");
    garden.facts["3x1"].gap = 2;
    stampBlooms(garden, DAY + 9);
    expect(garden.facts["3x1"]).toMatchObject({ watered: DAY, gap: 2 });
  });
});
