import { describe, expect, it } from "vitest";
import { answer, multiplier, newRound, type Play } from "./answer";
import { gardenWith, row } from "./fixtures";
import { freshGarden, stage } from "./garden";

const DAY = 20_000;

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
    const result = answer(garden, state, "7x8", 56, false, DAY);
    expect(result).toMatchObject({ right: true, points: 10, before: 0 });
    expect(garden.facts["7x8"]).toEqual({
      lvl: 1,
      seen: 1,
      right: 1,
      wrong: 0,
      wilt: false,
      grown: DAY,
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
    const result = answer(freshGarden(), play(), "7x8", 56, true, DAY);
    expect(result).toMatchObject({ points: 15, fast: true });
  });

  it("counts two times from 5 in a row and three times from 10", () => {
    expect([4, 5, 9, 10].map(multiplier)).toEqual([1, 2, 2, 3]);
    const fifth = answer(
      freshGarden(),
      play({ streak: 4 }),
      "7x8",
      56,
      false,
      DAY,
    );
    expect(fifth).toMatchObject({ points: 20 });
    const tenth = answer(
      freshGarden(),
      play({ streak: 9 }),
      "7x8",
      56,
      true,
      DAY,
    );
    expect(tenth).toMatchObject({ points: 35 });
  });

  it("makes the plant bloom at the fourth level", () => {
    const garden = gardenWith({ "7x8": 3 });
    const state = play();
    expect(answer(garden, state, "7x8", 56, false, DAY)).toMatchObject({
      bloom: true,
      rowDone: false,
    });
    expect(stage(garden, "7x8")).toBe("l4");
    expect(state.round.blooms).toBe(1);

    expect(answer(garden, state, "7x8", 56, false, DAY)).toMatchObject({
      bloom: false,
      before: 4,
    });
    expect(stage(garden, "7x8")).toBe("l4");
    expect(state.round.blooms).toBe(1);
  });

  it("completes the row with its last bloom", () => {
    const garden = gardenWith({ ...row(7, 4), "7x8": 3 });
    expect(answer(garden, play(), "7x8", 56, false, DAY)).toMatchObject({
      bloom: true,
      rowDone: true,
    });
  });

  it("brings a gift with the third bloom", () => {
    const garden = gardenWith({ "1x1": 4, "1x2": 4, "1x3": 3 });
    const result = answer(garden, play(), "1x3", 3, false, DAY);
    expect(result).toMatchObject({ gift: { id: "kanne" } });
    expect(garden.deco).toEqual(["kanne"]);
  });

  it("brings a visitor each fifth time in a row", () => {
    const garden = freshGarden();
    const state = play({ streak: 4 });
    const fifth = answer(garden, state, "7x8", 56, false, DAY);
    expect(fifth).toMatchObject({ visitor: { kind: "bfly" } });
    expect(garden.critters).toHaveLength(1);
    const sixth = answer(garden, state, "7x9", 63, false, DAY);
    expect(sixth).toMatchObject({ visitor: null });
    expect(garden.critters).toHaveLength(1);
  });
});

describe("the rest days", () => {
  it("let a plant grow two levels on one day and then rest", () => {
    const garden = freshGarden();
    const state = play();
    expect(answer(garden, state, "7x8", 56, false, DAY)).toMatchObject({
      rest: false,
    });
    expect(answer(garden, state, "7x8", 56, false, DAY)).toMatchObject({
      rest: false,
    });
    expect(stage(garden, "7x8")).toBe("l2");

    const third = answer(garden, state, "7x8", 56, true, DAY);
    expect(third).toMatchObject({ right: true, points: 15, rest: true });
    expect(stage(garden, "7x8")).toBe("l2");
    expect(garden.facts["7x8"]).toMatchObject({ right: 3, grown: DAY });
    expect(state.streak).toBe(3);
  });

  it("bring the bud and the bloom each on a later day", () => {
    const garden = freshGarden();
    const state = play();
    answer(garden, state, "7x8", 56, false, DAY);
    answer(garden, state, "7x8", 56, false, DAY);

    expect(answer(garden, state, "7x8", 56, false, DAY + 1)).toMatchObject({
      rest: false,
    });
    expect(stage(garden, "7x8")).toBe("l3");
    expect(answer(garden, state, "7x8", 56, false, DAY + 1)).toMatchObject({
      rest: true,
      bloom: false,
    });
    expect(stage(garden, "7x8")).toBe("l3");

    expect(answer(garden, state, "7x8", 56, false, DAY + 3)).toMatchObject({
      rest: false,
      bloom: true,
    });
    expect(stage(garden, "7x8")).toBe("l4");
  });

  it("do not hold back a bloom", () => {
    const garden = gardenWith({ "7x8": 4 });
    garden.facts["7x8"].grown = DAY;
    expect(answer(garden, play(), "7x8", 56, false, DAY)).toMatchObject({
      rest: false,
      before: 4,
    });
  });

  it("start again after an error", () => {
    const garden = gardenWith({ "7x8": 3 });
    garden.facts["7x8"].grown = DAY;
    const state = play();
    answer(garden, state, "7x8", 54, false, DAY);
    answer(garden, state, "7x8", 56, false, DAY);
    expect(answer(garden, state, "7x8", 56, false, DAY)).toMatchObject({
      rest: false,
      freshAgain: true,
    });
    expect(stage(garden, "7x8")).toBe("l2");
  });
});

describe("a wrong answer", () => {
  it("wilts the plant and ends the series", () => {
    const garden = gardenWith({ "7x8": 3 });
    garden.best = 7;
    const state = play({ streak: 7 });
    expect(answer(garden, state, "7x8", 54, true, DAY)).toEqual({
      right: false,
    });
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
    answer(freshGarden(), state, "7x8", 54, false, DAY);
    expect(state.comeback).toEqual([
      { key: "7x8", due: 5 },
      { key: "7x8", due: 9 },
    ]);
  });

  it("does not queue the same task more than two times", () => {
    const garden = freshGarden();
    const state = play();
    answer(garden, state, "7x8", 54, false, DAY);
    state.qn = 3;
    answer(garden, state, "7x8", 54, false, DAY);
    expect(state.comeback).toEqual([
      { key: "7x8", due: 5 },
      { key: "7x8", due: 9 },
    ]);
    expect(state.round.missed).toEqual(["7x8"]);
  });

  it("stays wilted until two right answers follow", () => {
    const garden = freshGarden();
    const state = play();
    answer(garden, state, "7x8", 54, false, DAY);
    expect(answer(garden, state, "7x8", 56, false, DAY)).toMatchObject({
      freshAgain: false,
    });
    expect(stage(garden, "7x8")).toBe("wilt");
    expect(answer(garden, state, "7x8", 56, false, DAY)).toMatchObject({
      freshAgain: true,
    });
    expect(stage(garden, "7x8")).toBe("l2");
  });
});
