import { describe, expect, it } from "vitest";
import { gardenWith, row } from "./fixtures";
import {
  allKeys,
  bloomCount,
  bloomingNeighbours,
  factors,
  freshGarden,
  guests,
  keyOf,
  rowComplete,
  stage,
} from "./garden";

describe("stage", () => {
  it("is a seed for a task that was never asked", () => {
    expect(stage(freshGarden(), "7x8")).toBe("u");
  });

  it("follows the level", () => {
    const garden = gardenWith({ "7x8": 0, "7x9": 3, "7x10": 4 });
    expect(stage(garden, "7x8")).toBe("l0");
    expect(stage(garden, "7x9")).toBe("l3");
    expect(stage(garden, "7x10")).toBe("l4");
  });

  it("is wilted after an error", () => {
    const garden = gardenWith({ "7x8": 0 });
    garden.facts["7x8"].wilt = true;
    expect(stage(garden, "7x8")).toBe("wilt");
  });
});

describe("bloomCount", () => {
  it("counts only the plants in bloom", () => {
    const garden = gardenWith({ "1x1": 4, "1x2": 4, "1x3": 3, "1x4": 0 });
    expect(bloomCount(garden)).toBe(2);
  });

  it("is zero for a new garden", () => {
    expect(bloomCount(freshGarden())).toBe(0);
  });
});

describe("rowComplete", () => {
  it("is true when all ten plants of the row bloom", () => {
    expect(rowComplete(gardenWith(row(3, 4)), 3)).toBe(true);
  });

  it("is false when one plant does not bloom", () => {
    const garden = gardenWith({ ...row(3, 4), "3x7": 3 });
    expect(rowComplete(garden, 3)).toBe(false);
  });

  it("is false for the other rows", () => {
    expect(rowComplete(gardenWith(row(3, 4)), 4)).toBe(false);
  });
});

describe("keys", () => {
  it("has one key for each of the 100 tasks", () => {
    expect(new Set(allKeys()).size).toBe(100);
  });

  it("reads the factors back from a key", () => {
    expect(factors(keyOf(10, 7))).toEqual([10, 7]);
  });
});

describe("bloomingNeighbours", () => {
  it("finds the blooms around a plant, also across the corners", () => {
    const garden = gardenWith({ "4x5": 4, "5x4": 4, "6x6": 4, "5x7": 4 });
    expect(bloomingNeighbours(garden, "5x5")).toEqual(["4x5", "5x4", "6x6"]);
  });

  it("leaves out plants that do not bloom yet", () => {
    const garden = gardenWith({ "4x5": 3, "5x5": 4 });
    expect(bloomingNeighbours(garden, "5x5")).toEqual([]);
  });

  it("stays inside the garden at the edge", () => {
    const garden = gardenWith({ "1x2": 4, "2x1": 4, "2x2": 4, "10x9": 4 });
    expect(bloomingNeighbours(garden, "1x1")).toEqual(["1x2", "2x1", "2x2"]);
    expect(bloomingNeighbours(garden, "10x10")).toEqual(["10x9"]);
  });
});

describe("guests", () => {
  it("brings no guest to a garden without blooms", () => {
    expect(guests(0)).toEqual({ bees: 0, butterflies: 0 });
  });

  it("brings a bee with the first bloom", () => {
    expect(guests(1)).toEqual({ bees: 1, butterflies: 0 });
  });

  it("brings more guests with more blooms, up to a limit", () => {
    expect(guests(8)).toEqual({ bees: 2, butterflies: 1 });
    expect(guests(100)).toEqual({ bees: 6, butterflies: 4 });
  });
});
