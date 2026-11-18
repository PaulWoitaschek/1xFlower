import { describe, expect, it } from "vitest";
import {
  builtIn,
  GROUP_IDS,
  GROUPS,
  LISTS,
  OWN_MAX,
  OWN_TEXT_MAX,
  parseEntry,
  parseOwn,
  WORDS,
} from "./vocab";

describe("the lists", () => {
  it("ship the travelling list with its five groups", () => {
    expect(LISTS.map((list) => list.id)).toEqual(["travelling"]);
    expect(GROUP_IDS).toEqual([
      "travelling/countries",
      "travelling/places",
      "travelling/holiday",
      "travelling/getting-around",
      "travelling/directions",
    ]);
    expect(GROUPS.map((group) => group.words.length)).toEqual([
      13, 43, 15, 18, 10,
    ]);
  });

  it("have no two words with the same English text or German meaning", () => {
    for (const list of LISTS) {
      const words = list.groups.flatMap((group) => group.words);
      expect(new Set(words.map((w) => w.en)).size).toBe(words.length);
      expect(new Set(words.map((w) => w.de)).size).toBe(words.length);
    }
  });

  it("have no two pictures that are the same within a group", () => {
    for (const group of GROUPS) {
      const pics = group.words.flatMap((word) => word.pic || []);
      expect(new Set(pics).size).toBe(pics.length);
    }
  });

  it("have words with a text, a meaning and the id of their group", () => {
    for (const word of WORDS) {
      expect(word.en.trim()).toBe(word.en);
      expect(word.de).not.toBe("");
      expect(GROUP_IDS).toContain(word.group);
    }
  });

  it("accept the other forms of some words", () => {
    expect(builtIn("the sea")!.also).toEqual(["sea"]);
    expect(builtIn("the USA")!.also).toEqual(["USA"]);
    expect(builtIn("on the left")!.also).toEqual(["on your left"]);
    expect(builtIn("on the right")!.also).toEqual(["on your right"]);
    expect(builtIn("city")!.also).toEqual([]);
  });
});

describe("parseEntry", () => {
  it("reads the English text and the German meaning", () => {
    expect(parseEntry("apple = Apfel")).toEqual({
      en: "apple",
      de: "Apfel",
      also: [],
      group: "own",
    });
  });

  it("tidies the spaces and the apostrophe", () => {
    expect(parseEntry("  it’s   me =  ich bin’s ")).toMatchObject({
      en: "it's me",
      de: "ich bin's",
    });
  });

  it("takes the variants with a slash or a comma, the first is the main one", () => {
    expect(parseEntry("colour / color = Farbe")).toMatchObject({
      en: "colour",
      also: ["color"],
    });
    expect(parseEntry("grey,gray,grey = grau")).toMatchObject({
      en: "grey",
      also: ["gray"],
    });
  });

  it("keeps a comma on the German side", () => {
    expect(parseEntry("road = Landstraße, Straße")!.de).toBe(
      "Landstraße, Straße",
    );
  });

  it("refuses an empty side, a missing equals sign and a long text", () => {
    expect(parseEntry("apple")).toBeNull();
    expect(parseEntry("= Apfel")).toBeNull();
    expect(parseEntry("apple =  ")).toBeNull();
    expect(parseEntry(" / , = Apfel")).toBeNull();
    expect(parseEntry("a".repeat(OWN_TEXT_MAX + 1) + " = x")).toBeNull();
    expect(parseEntry("x = " + "a".repeat(OWN_TEXT_MAX + 1))).toBeNull();
    expect(parseEntry("a/b/c/d/e/f = x")).toBeNull();
    expect(parseEntry("a".repeat(OWN_TEXT_MAX) + " = x")).not.toBeNull();
  });
});

describe("parseOwn", () => {
  it("keeps the valid entries, once per English text", () => {
    expect(
      parseOwn("apple = Apfel\nbad\npear=Birne; apple = anderer Apfel\n\n"),
    ).toEqual(["apple = Apfel", "pear = Birne"]);
  });

  it("writes the variants in a fixed way", () => {
    expect(parseOwn("colour,color=Farbe")).toEqual(["colour / color = Farbe"]);
  });

  it("keeps at most OWN_MAX entries", () => {
    const lines = Array.from({ length: OWN_MAX + 20 }, (_, i) => `w${i} = x`);
    expect(parseOwn(lines.join("\n"))).toHaveLength(OWN_MAX);
  });
});
