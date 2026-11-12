import { describe, expect, it } from "vitest";
import { DECO } from "../art/deco";
import { gardenWith, row } from "./fixtures";
import { freshGarden } from "./garden";
import { claimGifts, nextGift } from "./gifts";

describe("claimGifts", () => {
  it("gives nothing below 3 blooms", () => {
    const garden = gardenWith({ "1x1": 4, "1x2": 4, "1x3": 3 });
    expect(claimGifts(garden)).toBeNull();
    expect(garden.deco).toEqual([]);
  });

  it("gives the first gift at 3 blooms, and only one time", () => {
    const garden = gardenWith({ "1x1": 4, "1x2": 4, "1x3": 4 });
    expect(claimGifts(garden)?.id).toBe("kanne");
    expect(claimGifts(garden)).toBeNull();
    expect(garden.deco).toEqual(["kanne"]);
  });

  it("gives all gifts that the blooms reached, and returns the newest", () => {
    const garden = gardenWith(row(1, 4));
    expect(claimGifts(garden)?.id).toBe("pilze");
    expect(garden.deco).toEqual(["kanne", "pilze"]);
  });

  it("keeps a gift when a bloom wilts", () => {
    const garden = gardenWith({ "1x1": 4, "1x2": 4, "1x3": 4 });
    claimGifts(garden);
    garden.facts["1x3"].wilt = true;
    expect(claimGifts(garden)).toBeNull();
    expect(garden.deco).toEqual(["kanne"]);
  });
});

describe("nextGift", () => {
  it("tells how many blooms the next gift needs", () => {
    expect(nextGift(freshGarden())).toMatchObject({
      gift: { id: "kanne" },
      need: 3,
    });
    const garden = gardenWith({ "1x1": 4, "1x2": 4, "1x3": 4, "1x4": 4 });
    claimGifts(garden);
    expect(nextGift(garden)).toMatchObject({ gift: { id: "pilze" }, need: 6 });
  });

  it("counts to the full garden when no gift is left", () => {
    const garden = gardenWith({ ...row(1, 4), ...row(2, 4) });
    garden.deco = DECO.map((deco) => deco.id);
    expect(nextGift(garden)).toEqual({ gift: null, need: 80 });
  });

  it("has a gift for each bloom count in rising order", () => {
    const counts = DECO.map((deco) => deco.at);
    expect(counts).toEqual([...counts].sort((x, y) => x - y));
    expect(counts.at(-1)).toBeLessThanOrEqual(100);
  });
});
