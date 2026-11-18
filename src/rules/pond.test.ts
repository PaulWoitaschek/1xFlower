import { describe, expect, it } from "vitest";
import { newRound, type Play } from "./answer";
import { freshGarden, type Fact } from "./garden";
import {
  arrives,
  freshPond,
  lilyStage,
  nextResident,
  openLilies,
  pickPond,
  pondOf,
  pondWeight,
  pondWords,
  retryWord,
  TIP_POINTS,
  tryWord,
  wordOf,
} from "./pond";
import { builtIn, WORDS } from "./words";

const play = (): Play => ({
  streak: 0,
  qn: 1,
  last: null,
  comeback: [],
  water: [],
  round: newRound(10),
});

const hund = builtIn("Hund")!;
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

describe("pondWords", () => {
  it("starts with the easy words of all strategies", () => {
    const words = pondWords(freshPond());
    expect(words.length).toBeGreaterThan(60);
    expect(words.every((word) => word.level === 1)).toBe(true);
  });

  it("takes the chosen levels and strategies", () => {
    const pond = {
      ...freshPond(),
      levels: [3],
      strategies: ["merken" as const],
    };
    const words = pondWords(pond);
    expect(words).toEqual(
      WORDS.filter((word) => word.level === 3 && word.strategy === "merken"),
    );
  });

  it("adds the words from school, each only once", () => {
    const pond = { ...freshPond(), own: ["Spiel-platz", "Hund"] };
    const texts = pondWords(pond).map((word) => word.text);
    expect(texts.slice(0, 2)).toEqual(["Spielplatz", "Hund"]);
    expect(texts.filter((text) => text === "Hund")).toHaveLength(1);
  });

  it("asks only the words from school when the child wants it", () => {
    const pond = { ...freshPond(), own: ["Spiel-platz"], onlyOwn: true };
    expect(pondWords(pond).map((word) => word.text)).toEqual(["Spielplatz"]);
  });

  it("is never empty", () => {
    expect(pondWords({ ...freshPond(), levels: [] }).length).toBeGreaterThan(0);
    expect(pondWords({ ...freshPond(), onlyOwn: true }).length).toBeGreaterThan(
      0,
    );
  });
});

describe("wordOf", () => {
  it("finds a word from school with its syllables", () => {
    const pond = { ...freshPond(), own: ["Spiel-platz"] };
    expect(wordOf(pond, "Spielplatz").syllables).toEqual(["Spiel", "platz"]);
  });

  it("finds a word of the word list", () => {
    expect(wordOf(freshPond(), "Hund")).toBe(hund);
  });
});

describe("pondWeight", () => {
  it("asks errors most often", () => {
    const wilt = pondWeight(fact(0, { wilt: true, wrong: 1 }), TODAY);
    expect(wilt).toBeGreaterThan(pondWeight(fact(0), TODAY));
  });

  it("asks a lily that rests today rarely", () => {
    expect(pondWeight(fact(2, { grown: TODAY }), TODAY)).toBe(0.5);
  });

  it("asks a bloom that waited for some days before the lilies that grow", () => {
    const waited = fact(4, { watered: TODAY - 3, gap: 0 });
    expect(pondWeight(waited, TODAY)).toBeGreaterThan(
      pondWeight(fact(0), TODAY),
    );
  });
});

describe("pickPond", () => {
  it("picks a word of the pond", () => {
    const pond = { ...freshPond(), own: ["Spiel-platz"], onlyOwn: true };
    expect(pickPond(pond, play(), TODAY)).toBe("Spielplatz");
  });
});

describe("tryWord", () => {
  it("lets the lily grow for a right word, and counts the streak", () => {
    const garden = freshGarden();
    const state = play();
    const result = tryWord(garden, state, hund, "Hund", TODAY);
    expect(result).toMatchObject({ right: true, points: 10, before: 0 });
    expect(lilyStage(pondOf(garden), "Hund")).toBe("l1");
    expect(state.streak).toBe(1);
    expect(state.round.marks).toEqual(["ok"]);
    expect(garden.points).toBe(10);
  });

  it("gives no points for the speed", () => {
    const garden = freshGarden();
    const result = tryWord(garden, play(), hund, "Hund", TODAY);
    expect(result.right && result.points).toBe(10);
  });

  it("opens the bloom only on a later day", () => {
    const garden = freshGarden();
    pondOf(garden).facts.Hund = fact(3, { grown: TODAY });
    const rest = tryWord(garden, play(), hund, "Hund", TODAY);
    expect(rest).toMatchObject({ right: true, rest: true, bloom: false });
    const bloom = tryWord(garden, play(), hund, "Hund", TODAY + 1);
    expect(bloom).toMatchObject({ right: true, bloom: true });
    expect(openLilies(pondOf(garden))).toBe(1);
  });

  it("changes nothing after a wrong first try, and names the strategy", () => {
    const garden = freshGarden();
    pondOf(garden).facts.Hund = fact(2);
    const state = play();
    state.streak = 4;
    const result = tryWord(garden, state, hund, "Hunt", TODAY);
    expect(result.right).toBe(false);
    expect(!result.right && result.verdict.tip).toBe("verlaengern");
    expect(lilyStage(pondOf(garden), "Hund")).toBe("l2");
    expect(state.streak).toBe(4);
    expect(state.round.marks).toEqual([]);
    expect(state.round.n).toBe(1);
  });
});

describe("retryWord", () => {
  it("gives some points for a word that is right with the tip", () => {
    const garden = freshGarden();
    pondOf(garden).facts.Hund = fact(2);
    const state = play();
    state.streak = 4;
    tryWord(garden, state, hund, "Hunt", TODAY);
    const result = retryWord(garden, state, hund, "Hund");
    expect(result).toEqual({ right: true, points: TIP_POINTS });
    expect(lilyStage(pondOf(garden), "Hund")).toBe("l2");
    expect(state.streak).toBe(0);
    expect(state.round.marks).toEqual(["tip"]);
    expect(state.round.right).toBe(0);
    expect(state.comeback).toEqual([{ key: "Hund", due: 4 }]);
    expect(garden.points).toBe(TIP_POINTS);
  });

  it("wilts the lily after a second wrong try, and asks the word again", () => {
    const garden = freshGarden();
    pondOf(garden).facts.Hund = fact(2);
    const state = play();
    tryWord(garden, state, hund, "Hunt", TODAY);
    const result = retryWord(garden, state, hund, "Hunnt");
    expect(result.right).toBe(false);
    expect(lilyStage(pondOf(garden), "Hund")).toBe("wilt");
    expect(state.round.marks).toEqual(["bad"]);
    expect(state.round.missed).toEqual(["Hund"]);
    expect(state.comeback.map((c) => c.key)).toEqual(["Hund", "Hund"]);
  });
});

describe("the animals of the pond", () => {
  it("names the next animal and the lilies that it needs", () => {
    expect(nextResident(0)).toMatchObject({
      resident: { name: "Frosch" },
      need: 2,
    });
    expect(nextResident(2).resident?.name).toBe("Ente");
  });

  it("brings an animal with its number of open lilies", () => {
    expect(arrives(2)?.name).toBe("Frosch");
    expect(arrives(3)).toBeNull();
  });

  it("has no next animal when all are there", () => {
    expect(nextResident(999)).toEqual({ resident: null, need: 0 });
  });
});
