import { describe, expect, it } from "vitest";
import { newRound, type Play } from "./answer";
import { freshGarden, type Fact } from "./garden";
import {
  addNewLists,
  check,
  chooseWord,
  freshOrchard,
  nextOrchardResident,
  optionsOf,
  orchardArrives,
  orchardOf,
  orchardWords,
  ORCHARD_RESIDENTS,
  pickOrchard,
  retryWrite,
  rightStart,
  ripeTrees,
  setList,
  taskOf,
  tryWrite,
  wordOf,
} from "./orchard";
import { TIP_POINTS } from "./pond";
import { builtIn, GROUP_IDS, LIST_IDS, WORDS } from "./vocab";

const play = (): Play => ({
  streak: 0,
  qn: 1,
  last: null,
  comeback: [],
  water: [],
  round: newRound(10),
});

const TODAY = 100;
const fact = (lvl: number, more: Partial<Fact> = {}): Fact => ({
  lvl,
  seen: 1,
  right: lvl,
  wrong: 0,
  wilt: false,
  grown: 0,
  ...more,
});

const city = builtIn("city")!;
const sea = builtIn("the sea")!;
const left = builtIn("on the left")!;
const germany = builtIn("Germany")!;

// a random that counts up, so that a shuffle does not stay the same
const counting = () => {
  let n = 0;
  return () => ((n = (n + 7) % 13) + 0.5) / 13;
};

describe("orchardOf", () => {
  it("creates the orchard once, with all lists and groups", () => {
    const garden = freshGarden();
    const orchard = orchardOf(garden);
    expect(orchardOf(garden)).toBe(orchard);
    expect(orchard.lists).toEqual(["travelling"]);
    expect(orchard.groups).toHaveLength(5);
    expect(orchard.write).toBe(true);
    expect(orchard.onlyOwn).toBe(false);
  });
});

describe("orchardWords", () => {
  it("asks all built-in words at first", () => {
    expect(orchardWords(freshOrchard())).toEqual(WORDS);
  });

  it("takes the chosen groups", () => {
    const orchard = {
      ...freshOrchard(),
      groups: ["travelling/countries"],
    };
    const words = orchardWords(orchard);
    expect(words).toHaveLength(13);
    expect(words.every((w) => w.group === "travelling/countries")).toBe(true);
  });

  it("drops the words of a list that is not chosen, and setList brings it back", () => {
    const orchard = { ...freshOrchard(), groups: ["travelling/places"] };
    setList(orchard, "travelling", false);
    expect(orchardWords(orchard)).toEqual(WORDS);
    setList(orchard, "travelling", true);
    expect(orchard.lists).toEqual(["travelling"]);
    expect(orchard.groups).toHaveLength(5);
  });

  it("adds own words, and an own word wins over a built-in word", () => {
    const orchard = {
      ...freshOrchard(),
      own: ["apple = Apfel", "city = Metropole"],
    };
    const words = orchardWords(orchard);
    expect(words).toHaveLength(WORDS.length + 1);
    expect(words.filter((w) => w.en === "city")).toEqual([
      { en: "city", de: "Metropole", also: [], group: "own" },
    ]);
    expect(wordOf(orchard, "city")!.de).toBe("Metropole");
    expect(wordOf(orchard, "town")!.de).toBe("Stadt");
    expect(wordOf(orchard, "nonsense")).toBeUndefined();
  });

  it("asks only own words with onlyOwn, but falls back if there are none", () => {
    const orchard = {
      ...freshOrchard(),
      own: ["apple = Apfel"],
      onlyOwn: true,
    };
    expect(orchardWords(orchard).map((w) => w.en)).toEqual(["apple"]);
    expect(orchardWords({ ...orchard, own: [] })).toEqual(WORDS);
    expect(orchardWords({ ...orchard, own: ["bad entry"] })).toEqual(WORDS);
  });

  it("is never empty", () => {
    expect(orchardWords({ ...freshOrchard(), groups: [] })).toEqual(WORDS);
    expect(orchardWords({ ...freshOrchard(), lists: [] })).toEqual(WORDS);
  });
});

describe("taskOf", () => {
  const orchard = freshOrchard();
  orchard.facts = {
    a: fact(0),
    b: fact(1),
    c: fact(2),
    d: fact(3),
    e: fact(4),
    w: fact(0, { wilt: true, wrong: 1 }),
  };

  it("grows harder with the level", () => {
    expect(taskOf(orchard, "new")).toBe("meaning");
    expect(
      ["a", "b", "c", "d", "e", "w"].map((key) => taskOf(orchard, key)),
    ).toEqual(["meaning", "meaning", "choose", "write", "write", "meaning"]);
  });

  it("lets the child choose at level 3 and 4 without writing", () => {
    const soft = { ...orchard, write: false };
    expect(["c", "d", "e"].map((key) => taskOf(soft, key))).toEqual([
      "choose",
      "choose",
      "choose",
    ]);
  });
});

describe("optionsOf", () => {
  it("gives the right one and 3 others in all, with different texts", () => {
    for (const task of ["meaning", "choose"] as const) {
      for (const word of WORDS) {
        const options = optionsOf(freshOrchard(), word, task, counting());
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options).toContain(task === "meaning" ? word.de : word.en);
      }
    }
  });

  it("prefers the words of the same group", () => {
    const options = optionsOf(freshOrchard(), germany, "choose", counting());
    const countries = WORDS.filter((w) => w.group === germany.group).map(
      (w) => w.en,
    );
    expect(options.every((o) => countries.includes(o))).toBe(true);
  });

  it("takes the words that the orchard asks, and fills up from all words", () => {
    const orchard = {
      ...freshOrchard(),
      own: ["apple = Apfel"],
      onlyOwn: true,
    };
    const apple = wordOf(orchard, "apple")!;
    const options = optionsOf(orchard, apple, "meaning", counting());
    expect(options).toHaveLength(4);
    expect(options).toContain("Apfel");
    expect(
      options
        .filter((o) => o !== "Apfel")
        .every((o) => WORDS.some((w) => w.de === o)),
    ).toBe(true);
  });

  it("never offers another right answer", () => {
    const alias = {
      ...freshOrchard(),
      own: ["colour / color = Farbe", "color = Farbwort"],
    };
    const first = wordOf(alias, "colour")!;
    for (let i = 0; i < 20; i++) {
      expect(optionsOf(alias, first, "choose", counting())).not.toContain(
        "color",
      );
    }
    const near = optionsOf(freshOrchard(), left, "choose", () => 0.1);
    expect(near).not.toContain("on your left");
  });

  it("does not repeat a German meaning of an own word", () => {
    const orchard = {
      ...freshOrchard(),
      own: ["a1 = eins", "a2 = zwei", "a3 = eins"],
      onlyOwn: true,
    };
    for (let i = 0; i < 20; i++) {
      const options = optionsOf(
        orchard,
        wordOf(orchard, "a1")!,
        "meaning",
        counting(),
      );
      expect(new Set(options).size).toBe(4);
    }
  });

  it("puts the right one in a random place", () => {
    const places = new Set<number>();
    const random = counting();
    for (let i = 0; i < 40; i++)
      places.add(
        optionsOf(freshOrchard(), city, "choose", random).indexOf("city"),
      );
    expect(places.size).toBeGreaterThan(1);
  });
});

describe("pickOrchard", () => {
  it("picks a word that the orchard asks", () => {
    const orchard = {
      ...freshOrchard(),
      own: ["apple = Apfel"],
      onlyOwn: true,
    };
    expect(pickOrchard(orchard, play(), TODAY, () => 0.5)).toBe("apple");
  });

  it("asks a wilted tree before a ripe one", () => {
    const orchard = { ...freshOrchard(), groups: ["travelling/countries"] };
    orchard.facts = Object.fromEntries(
      orchardWords(orchard).map((w) => [w.en, fact(4, { watered: TODAY })]),
    );
    orchard.facts["Spain"] = fact(0, { wilt: true, wrong: 1 });
    expect(pickOrchard(orchard, play(), TODAY, () => 0.5)).toBe("Spain");
  });
});

describe("chooseWord", () => {
  it("lets the tree grow after a right choice", () => {
    const garden = freshGarden();
    const result = chooseWord(
      garden,
      play(),
      city,
      "meaning",
      "Großstadt",
      TODAY,
    );
    expect(result).toMatchObject({ right: true, before: 0, rest: false });
    expect(orchardOf(garden).facts["city"]).toMatchObject({
      lvl: 1,
      seen: 1,
      right: 1,
      grown: TODAY,
    });
    expect(garden.points).toBeGreaterThan(0);
  });

  it("wilts the tree after a wrong choice and brings the word back", () => {
    const garden = freshGarden();
    orchardOf(garden).facts["city"] = fact(2);
    const p = play();
    const result = chooseWord(garden, p, city, "choose", "town", TODAY);
    expect(result).toEqual({ right: false });
    expect(orchardOf(garden).facts["city"]).toMatchObject({
      lvl: 0,
      wilt: true,
      wrong: 1,
    });
    expect(p.comeback.map((c) => c.key)).toEqual(["city", "city"]);
    expect(p.round.missed).toEqual(["city"]);
  });

  it("rests a tree that grew today, as in the pond", () => {
    const garden = freshGarden();
    orchardOf(garden).facts["city"] = fact(2, { grown: TODAY });
    const result = chooseWord(garden, play(), city, "choose", "city", TODAY);
    expect(result).toMatchObject({ right: true, rest: true });
    expect(orchardOf(garden).facts["city"].lvl).toBe(2);
  });

  it("blooms and waters a ripe tree", () => {
    const garden = freshGarden();
    orchardOf(garden).facts["city"] = fact(3);
    const result = chooseWord(garden, play(), city, "choose", "city", TODAY);
    expect(result).toMatchObject({ right: true, bloom: true });
    expect(ripeTrees(orchardOf(garden))).toBe(1);
  });
});

describe("check", () => {
  it("accepts the text and its other forms", () => {
    expect(check(sea, "the sea").right).toBe(true);
    expect(check(sea, "sea").right).toBe(true);
    expect(check(left, "on your left")).toMatchObject({
      right: true,
      wrong: [],
    });
  });

  it("trims, collapses spaces and treats the apostrophes as the same", () => {
    expect(check(city, "  city ").right).toBe(true);
    const own = wordOf(
      { ...freshOrchard(), own: ["it's me = ich"] },
      "it's me",
    )!;
    expect(check(own, "it’s   me").right).toBe(true);
    expect(check(left, "on  the   left").right).toBe(true);
  });

  it("says when only the capital letter differs, and it is not right", () => {
    expect(check(germany, "germany")).toMatchObject({
      right: false,
      tip: "gross",
      wrong: [0],
    });
    expect(check(sea, "The sea")).toMatchObject({
      right: false,
      tip: "klein",
      wrong: [0],
      target: "the sea",
    });
    expect(check(germany, "GERMANY").tip).toBe("klein");
  });

  it("marks the wrong letters of the nearest form", () => {
    expect(check(city, "cuty")).toMatchObject({
      right: false,
      tip: null,
      target: "city",
      wrong: [1],
    });
    expect(check(left, "on your lef")).toMatchObject({
      target: "on your left",
      wrong: [11],
    });
    expect(check(city, "").wrong).toEqual([0, 1, 2, 3]);
  });
});

describe("write task", () => {
  it("lets the tree grow when the first try is right", () => {
    const garden = freshGarden();
    orchardOf(garden).facts["city"] = fact(3);
    const result = tryWrite(garden, play(), city, "city", TODAY);
    expect(result).toMatchObject({ right: true, bloom: true });
  });

  it("changes nothing yet when the first try is wrong", () => {
    const garden = freshGarden();
    const p = play();
    const result = tryWrite(garden, p, city, "sity", TODAY);
    expect(result).toMatchObject({ right: false });
    expect(orchardOf(garden).facts["city"]).toMatchObject({
      seen: 1,
      wrong: 0,
      wilt: false,
    });
    expect(p.comeback).toEqual([]);
  });

  it("gives tip points and a comeback for a right second try", () => {
    const garden = freshGarden();
    const p = play();
    tryWrite(garden, p, city, "sity", TODAY);
    const result = retryWrite(garden, p, city, "city");
    expect(result).toEqual({ right: true, points: TIP_POINTS });
    expect(garden.points).toBe(TIP_POINTS);
    expect(p.comeback).toEqual([{ key: "city", due: p.qn + 3 }]);
    expect(p.round.marks).toEqual(["tip"]);
    expect(orchardOf(garden).facts["city"].wrong).toBe(1);
  });

  it("wilts the tree after a second error", () => {
    const garden = freshGarden();
    const p = play();
    orchardOf(garden).facts["city"] = fact(3);
    tryWrite(garden, p, city, "sity", TODAY);
    const result = retryWrite(garden, p, city, "citty");
    expect(result).toMatchObject({ right: false });
    expect(orchardOf(garden).facts["city"]).toMatchObject({
      lvl: 0,
      wilt: true,
    });
  });
});

describe("ripeTrees", () => {
  it("counts the trees at level 4 that are not wilted", () => {
    const orchard = freshOrchard();
    orchard.facts = {
      a: fact(4),
      b: fact(4, { wilt: true }),
      c: fact(3),
      d: fact(4, { seen: 0 }),
    };
    expect(ripeTrees(orchard)).toBe(1);
  });
});

describe("the animals", () => {
  it("come with the ripe trees", () => {
    expect(ORCHARD_RESIDENTS.length).toBeGreaterThanOrEqual(6);
    expect(ORCHARD_RESIDENTS.length).toBeLessThanOrEqual(8);
    expect(orchardArrives(0)).toBeNull();
    expect(orchardArrives(2)!.pic).toBe("🦔");
    expect(nextOrchardResident(2)).toEqual({
      resident: ORCHARD_RESIDENTS[1],
      need: 3,
    });
    expect(nextOrchardResident(999)).toEqual({ resident: null, need: 0 });
  });
});

describe("addNewLists", () => {
  it("does nothing when all lists are chosen", () => {
    const orchard = freshOrchard();
    expect(addNewLists(orchard)).toBe(false);
    expect(orchard.groups).toEqual(GROUP_IDS);
  });

  it("adds a list that a saved orchard lacks, with its groups", () => {
    const orchard = freshOrchard();
    orchard.lists = [];
    orchard.groups = [];
    expect(addNewLists(orchard)).toBe(true);
    expect(orchard.lists).toEqual(LIST_IDS);
    expect(orchard.groups).toEqual(GROUP_IDS);
  });

  it("keeps the groups that the child dropped from the other lists", () => {
    const orchard = freshOrchard();
    orchard.groups = orchard.groups.filter((id) => id !== GROUP_IDS[0]);
    addNewLists(orchard);
    expect(orchard.groups).not.toContain(GROUP_IDS[0]);
  });
});

describe("rightStart", () => {
  it("counts the letters that are right at the start", () => {
    expect(rightStart("appel", "apple")).toBe(3);
    expect(rightStart("apple", "apple")).toBe(5);
    expect(rightStart("xpple", "apple")).toBe(0);
  });

  it("stops at the end of the typed text or of the target", () => {
    expect(rightStart("app", "apple")).toBe(3);
    expect(rightStart("apples", "apple")).toBe(5);
  });

  it("ignores capital letters and extra spaces", () => {
    expect(rightStart("The  usa", "the USA")).toBe(7);
  });
});
