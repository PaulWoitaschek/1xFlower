import { describe, expect, it } from "vitest";
import { newRound, type Play } from "./answer";
import {
  answerFarm,
  CHICK_MEALS,
  divKey,
  divParts,
  EGG_WARMTH,
  eggStage,
  farmOf,
  farmPool,
  feedableBlooms,
  feedFlower,
  feedHay,
  flowerTask,
  FLOCK_MAX,
  freshFarm,
  full,
  LAY_MEALS,
  NEST_MAX,
  patchStage,
  pickFarm,
  quotientOf,
  START_HAY,
  type Chicken,
  type Farm,
} from "./farm";
import { gardenWith } from "./fixtures";
import { canGrow, freshGarden, stage, type Garden } from "./garden";
import { thirsty } from "./thirst";

const DAY = 20_000;

const play = (changes: Partial<Play> = {}): Play => ({
  qn: 1,
  last: null,
  comeback: [],
  water: [],
  streak: 0,
  round: newRound(),
  ...changes,
});

const chicken = (changes: Partial<Chicken> = {}): Chicken => ({
  id: "c",
  color: 0,
  grown: false,
  meals: 0,
  ...changes,
});

function gardenWithFarm(changes: Partial<Farm> = {}): Garden {
  const garden = freshGarden();
  garden.farm = { ...freshFarm(), ...changes };
  return garden;
}

describe("the division tasks", () => {
  it("write the dividend and the divisor", () => {
    expect(divKey(8, 7)).toBe("56:8");
    expect(divParts("56:8")).toEqual([56, 8]);
    expect(quotientOf("56:8")).toBe(7);
  });

  it("come from the practiced divisors", () => {
    const keys = farmPool([3]);
    expect(keys).toHaveLength(10);
    expect(keys[0]).toBe("3:3");
    expect(keys[9]).toBe("30:3");
  });

  it("a bloom asks its product divided by its row", () => {
    expect(flowerTask("7x8")).toBe("56:7");
  });
});

describe("a new farm", () => {
  it("has an egg, some hay and the first rows of the division", () => {
    const garden = freshGarden();
    const farm = farmOf(garden);
    expect(farm.eggs).toHaveLength(1);
    expect(farm.hay).toBe(START_HAY);
    expect(farm.rows).toEqual([2, 5, 10]);
    expect(farm.chickens).toEqual([]);
    expect(farmOf(garden)).toBe(farm);
  });
});

describe("a right division answer", () => {
  it("grows the grass and brings points", () => {
    const garden = gardenWithFarm();
    const state = play();
    const result = answerFarm(garden, state, "56:8", 7, true);
    expect(result).toMatchObject({ right: true, points: 15, bale: false });
    expect(patchStage(garden.farm!, "56:8")).toBe("l1");
    expect(garden.points).toBe(15);
    expect(state.streak).toBe(1);
    expect(state.round.right).toBe(1);
  });

  it("makes hay from high grass, also again and again", () => {
    const garden = gardenWithFarm({ hay: 0 });
    for (let i = 0; i < 3; i++) answerFarm(garden, play(), "56:8", 7, false);
    expect(garden.farm!.hay).toBe(0);
    const first = answerFarm(garden, play(), "56:8", 7, false);
    expect(first).toMatchObject({ bale: true, newHay: true });
    expect(patchStage(garden.farm!, "56:8")).toBe("l4");
    const again = answerFarm(garden, play(), "56:8", 7, false);
    expect(again).toMatchObject({ bale: true, newHay: false });
    expect(garden.farm!.hay).toBe(2);
  });

  it("tells when the whole row is hay", () => {
    const garden = gardenWithFarm();
    const farm = garden.farm!;
    for (const key of farmPool([2])) {
      farm.facts[key] = {
        lvl: key === "4:2" ? 3 : 4,
        seen: 4,
        right: 4,
        wrong: 0,
        wilt: false,
        grown: 0,
      };
    }
    expect(answerFarm(garden, play(), "4:2", 2, false)).toMatchObject({
      rowDone: true,
    });
  });

  it("warms the egg until a chick hatches", () => {
    const garden = gardenWithFarm();
    const farm = garden.farm!;
    for (let i = 1; i < EGG_WARMTH; i++) {
      const result = answerFarm(garden, play(), farmPool([5])[i], i + 1, false);
      expect(result).toMatchObject({ warmed: true, hatched: null });
    }
    expect(eggStage(farm.eggs[0])).toBe(3);
    const result = answerFarm(garden, play(), "5:5", 1, false, () => 0.5);
    expect(result).toMatchObject({ hatched: { grown: false, color: 2 } });
    expect(farm.eggs).toEqual([]);
    expect(farm.chickens).toHaveLength(1);
    expect(answerFarm(garden, play(), "10:5", 2, false)).toMatchObject({
      warmed: false,
      hatched: null,
    });
  });
});

describe("a wrong division answer", () => {
  it("dries the grass and brings the task back", () => {
    const garden = gardenWithFarm();
    answerFarm(garden, play(), "56:8", 7, false);
    const state = play({ streak: 3 });
    expect(answerFarm(garden, state, "56:8", 8, false)).toEqual({
      right: false,
    });
    expect(patchStage(garden.farm!, "56:8")).toBe("wilt");
    expect(state.streak).toBe(0);
    expect(state.comeback.map((c) => c.key)).toEqual(["56:8", "56:8"]);
    expect(state.round.missed).toEqual(["56:8"]);
  });

  it("does not warm the egg", () => {
    const garden = gardenWithFarm();
    answerFarm(garden, play(), "56:8", 8, false);
    expect(garden.farm!.eggs[0].warmth).toBe(0);
  });
});

describe("the next division task", () => {
  it("comes from the practiced rows", () => {
    const farm = { ...freshFarm(), rows: [4] };
    for (let i = 0; i < 20; i++) {
      expect(divParts(pickFarm(farm, play(), Math.random))[1]).toBe(4);
    }
  });

  it("prefers growing grass over hay", () => {
    const farm = { ...freshFarm(), rows: [1] };
    for (const key of farmPool([1])) {
      farm.facts[key] = {
        lvl: key === "3:1" ? 2 : 4,
        seen: 4,
        right: 4,
        wrong: 0,
        wilt: false,
        grown: 0,
      };
    }
    // 9 hay patches weigh 0.5 each, the growing grass 6
    expect(pickFarm(farm, play(), () => 0.6)).toBe("3:1");
  });
});

describe("feeding with hay", () => {
  it("takes a bale from the barn", () => {
    const farm = { ...freshFarm(), hay: 2, chickens: [chicken()] };
    expect(feedHay(farm, "c")).toEqual({ grown: false, egg: false });
    expect(farm.hay).toBe(1);
    expect(farm.chickens[0].meals).toBe(1);
  });

  it("needs hay in the barn", () => {
    const farm = { ...freshFarm(), hay: 0, chickens: [chicken()] };
    expect(feedHay(farm, "c")).toBeNull();
    expect(farm.chickens[0].meals).toBe(0);
  });

  it("makes a chick a hen after some meals", () => {
    const farm = { ...freshFarm(), hay: 9, chickens: [chicken()] };
    for (let i = 1; i < CHICK_MEALS; i++) feedHay(farm, "c");
    expect(feedHay(farm, "c")).toEqual({ grown: true, egg: false });
    expect(farm.chickens[0]).toMatchObject({ grown: true, meals: 0 });
  });

  it("lets a hen lay an egg after some meals", () => {
    const farm = {
      ...freshFarm(),
      eggs: [],
      hay: 9,
      chickens: [chicken({ grown: true })],
    };
    for (let i = 1; i < LAY_MEALS; i++) feedHay(farm, "c");
    expect(feedHay(farm, "c")).toEqual({ grown: false, egg: true });
    expect(farm.eggs).toHaveLength(1);
    expect(farm.chickens[0].meals).toBe(0);
  });

  it("does not feed a hen that waits for room in the full nest", () => {
    const eggs = Array.from({ length: NEST_MAX }, (_, i) => ({
      id: "e" + i,
      warmth: 0,
    }));
    const hen = chicken({ grown: true, meals: LAY_MEALS - 1 });
    const farm = { ...freshFarm(), eggs, hay: 9, chickens: [hen] };
    expect(feedHay(farm, "c")).toEqual({ grown: false, egg: false });
    expect(full(farm, hen)).toBe(true);
    expect(feedHay(farm, "c")).toBeNull();
    expect(farm.hay).toBe(8);
  });

  it("lets the waiting hen lay when a chick hatches", () => {
    const eggs = Array.from({ length: NEST_MAX }, (_, i) => ({
      id: "e" + i,
      warmth: i ? 0 : EGG_WARMTH - 1,
    }));
    const hen = chicken({ grown: true, meals: LAY_MEALS });
    const garden = gardenWithFarm({ eggs, chickens: [hen] });
    answerFarm(garden, play(), "4:2", 2, false);
    expect(garden.farm!.chickens).toHaveLength(2);
    expect(garden.farm!.eggs).toHaveLength(NEST_MAX);
    expect(hen.meals).toBe(0);
  });

  it("lays into the basket when the flock is full", () => {
    const chickens = Array.from({ length: FLOCK_MAX }, (_, i) =>
      chicken({ id: "c" + i, grown: true }),
    );
    const farm: Farm = { ...freshFarm(), eggs: [], hay: 9, chickens };
    for (let i = 1; i < LAY_MEALS; i++) feedHay(farm, "c0");
    expect(feedHay(farm, "c0")).toEqual({
      grown: false,
      egg: true,
      basket: true,
    });
    expect(farm.eggs).toEqual([]);
    expect(farm.basket).toBe(1);
    expect(full(farm, chickens[0])).toBe(false);
    for (let i = 0; i < LAY_MEALS; i++) feedHay(farm, "c0");
    expect(farm.basket).toBe(2);
  });

  it("fills the basket when the eggs fill the flock", () => {
    const chickens = Array.from({ length: FLOCK_MAX - 1 }, (_, i) =>
      chicken({ id: "c" + i, grown: true, meals: LAY_MEALS - 1 }),
    );
    const farm: Farm = { ...freshFarm(), hay: 9, chickens };
    expect(feedHay(farm, "c0")?.basket).toBe(true);
    expect(farm.eggs).toHaveLength(1);
  });
});

describe("feeding with a bloom", () => {
  it("lets the bloom grow again over two later days", () => {
    const garden = gardenWith({ "7x8": 4, "3x3": 2 });
    garden.facts["7x8"].watered = DAY - 9;
    garden.farm = { ...freshFarm(), chickens: [chicken()] };
    expect(feedableBlooms(garden)).toEqual(["7x8"]);
    expect(feedFlower(garden, "c", "7x8", DAY)).toEqual({
      grown: false,
      egg: false,
    });
    const fact = garden.facts["7x8"];
    expect(stage(garden, "7x8")).toBe("l2");
    expect(canGrow(fact, DAY)).toBe(false);
    expect(canGrow(fact, DAY + 1)).toBe(true);
    expect(thirsty(fact, DAY + 30)).toBe(false);
    expect(garden.farm.chickens[0].meals).toBe(1);
  });

  it("needs a bloom", () => {
    const garden = gardenWith({ "7x8": 3 });
    garden.farm = { ...freshFarm(), chickens: [chicken()] };
    expect(feedFlower(garden, "c", "7x8", DAY)).toBeNull();
    expect(stage(garden, "7x8")).toBe("l3");
  });
});
