import { describe, expect, it } from "vitest";
import { answer, multiplier, newRound, type Play } from "./answer";
import { gardenWith, row } from "./fixtures";
import { freshGarden, stage } from "./garden";

const play = (changes: Partial<Play> = {}): Play => ({
  qn: 1,
  last: null,
  comeback: [],
  streak: 0,
  round: newRound(),
  ...changes,
});

describe("a right answer", () => {
  it("grows the plant by one level", () => {
    const garden = freshGarden();
    const state = play();
    const result = answer(garden, state, "7x8", 56, false);
    expect(result).toMatchObject({ right: true, points: 10, before: 0 });
    expect(garden.facts["7x8"]).toEqual({
      lvl: 1,
      seen: 1,
      right: 1,
      wrong: 0,
      wilt: false,
    });
    expect(garden.points).toBe(10);
    expect(garden.best).toBe(1);
    expect(state.streak).toBe(1);
    expect(state.last).toBe("7x8");
    expect(state.round).toEqual({
      n: 1,
      right: 1,
      points: 10,
      blooms: 0,
      marks: ["ok"],
      missed: [],
    });
  });

  it("gives 5 more points when it is fast", () => {
    const result = answer(freshGarden(), play(), "7x8", 56, true);
    expect(result).toMatchObject({ points: 15, fast: true });
  });

  it("counts two times from 5 in a row and three times from 10", () => {
    expect([4, 5, 9, 10].map(multiplier)).toEqual([1, 2, 2, 3]);
    const fifth = answer(freshGarden(), play({ streak: 4 }), "7x8", 56, false);
    expect(fifth).toMatchObject({ points: 20 });
    const tenth = answer(freshGarden(), play({ streak: 9 }), "7x8", 56, true);
    expect(tenth).toMatchObject({ points: 35 });
  });

  it("makes the plant bloom at the fourth level", () => {
    const garden = gardenWith({ "7x8": 3 });
    const state = play();
    expect(answer(garden, state, "7x8", 56, false)).toMatchObject({
      bloom: true,
      rowDone: false,
    });
    expect(stage(garden, "7x8")).toBe("l4");
    expect(state.round.blooms).toBe(1);

    expect(answer(garden, state, "7x8", 56, false)).toMatchObject({
      bloom: false,
      before: 4,
    });
    expect(stage(garden, "7x8")).toBe("l4");
    expect(state.round.blooms).toBe(1);
  });

  it("completes the row with its last bloom", () => {
    const garden = gardenWith({ ...row(7, 4), "7x8": 3 });
    expect(answer(garden, play(), "7x8", 56, false)).toMatchObject({
      bloom: true,
      rowDone: true,
    });
  });

  it("brings a gift with the third bloom", () => {
    const garden = gardenWith({ "1x1": 4, "1x2": 4, "1x3": 3 });
    const result = answer(garden, play(), "1x3", 3, false);
    expect(result).toMatchObject({ gift: { id: "kanne" } });
    expect(garden.deco).toEqual(["kanne"]);
  });

  it("brings a visitor each fifth time in a row", () => {
    const garden = freshGarden();
    const state = play({ streak: 4 });
    const fifth = answer(garden, state, "7x8", 56, false);
    expect(fifth).toMatchObject({ visitor: { kind: "bfly" } });
    expect(garden.critters).toHaveLength(1);
    const sixth = answer(garden, state, "7x9", 63, false);
    expect(sixth).toMatchObject({ visitor: null });
    expect(garden.critters).toHaveLength(1);
  });
});

describe("a wrong answer", () => {
  it("wilts the plant and ends the series", () => {
    const garden = gardenWith({ "7x8": 3 });
    garden.best = 7;
    const state = play({ streak: 7 });
    expect(answer(garden, state, "7x8", 54, true)).toEqual({ right: false });
    expect(garden.facts["7x8"]).toMatchObject({ lvl: 0, wrong: 1, wilt: true });
    expect(stage(garden, "7x8")).toBe("wilt");
    expect(garden.points).toBe(0);
    expect(garden.best).toBe(7);
    expect(state.streak).toBe(0);
    expect(state.round).toMatchObject({
      n: 1,
      right: 0,
      marks: ["bad"],
      missed: ["7x8"],
    });
  });

  it("brings the task back after 2 and after 6 tasks", () => {
    const state = play({ qn: 3 });
    answer(freshGarden(), state, "7x8", 54, false);
    expect(state.comeback).toEqual([
      { key: "7x8", due: 5 },
      { key: "7x8", due: 9 },
    ]);
  });

  it("does not queue the same task more than two times", () => {
    const garden = freshGarden();
    const state = play();
    answer(garden, state, "7x8", 54, false);
    state.qn = 3;
    answer(garden, state, "7x8", 54, false);
    expect(state.comeback).toEqual([
      { key: "7x8", due: 5 },
      { key: "7x8", due: 9 },
    ]);
    expect(state.round.missed).toEqual(["7x8"]);
  });

  it("stays wilted until two right answers follow", () => {
    const garden = freshGarden();
    const state = play();
    answer(garden, state, "7x8", 54, false);
    expect(answer(garden, state, "7x8", 56, false)).toMatchObject({
      freshAgain: false,
    });
    expect(stage(garden, "7x8")).toBe("wilt");
    expect(answer(garden, state, "7x8", 56, false)).toMatchObject({
      freshAgain: true,
    });
    expect(stage(garden, "7x8")).toBe("l2");
  });
});
