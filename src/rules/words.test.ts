import { describe, expect, it } from "vitest";
import {
  gap,
  guessSpots,
  LEVELS,
  ownWord,
  parseMarked,
  parseOwn,
  STRATEGIES,
  syllabify,
  WORDS,
} from "./words";

describe("parseMarked", () => {
  it("reads the syllables and the hard places", () => {
    expect(parseMarked("F(ah)r-ra(d)")).toEqual({
      text: "Fahrrad",
      syllables: ["Fahr", "rad"],
      ranges: [
        [1, 2],
        [6, 1],
      ],
    });
  });

  it("reads a hard place across two syllables", () => {
    expect(parseMarked("wa(ch-s)en")).toEqual({
      text: "wachsen",
      syllables: ["wach", "sen"],
      ranges: [[2, 3]],
    });
  });
});

describe("the word list", () => {
  it("has each word only once", () => {
    const texts = WORDS.map((word) => word.text);
    expect(texts.filter((text, i) => texts.indexOf(text) !== i)).toEqual([]);
  });

  it("has words for each strategy on each level", () => {
    for (const strategy of STRATEGIES) {
      for (const level of LEVELS) {
        const count = WORDS.filter(
          (word) => word.strategy === strategy && word.level === level,
        ).length;
        expect(count, strategy + " " + level).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it("has a sentence with a gap for each word", () => {
    for (const word of WORDS) {
      const text = gap(word);
      expect(text, word.text).toContain("___");
      expect(text.replace("___", word.text), word.text).toBe(word.sentence);
      expect(text, word.text).not.toMatch(
        new RegExp("(?<!\\p{L})" + word.text + "(?!\\p{L})", "iu"),
      );
    }
  });

  it("marks each hard place inside the word, with its strategy", () => {
    for (const word of WORDS) {
      expect(word.syllables.join(""), word.text).toBe(word.text);
      for (const spot of word.spots) {
        expect(STRATEGIES, word.text).toContain(spot.strategy);
        expect(spot.len, word.text).toBeGreaterThan(0);
        expect(spot.at + spot.len, word.text).toBeLessThanOrEqual(
          word.text.length,
        );
      }
    }
  });

  it("gives each word to lengthen or to derive a hard place with a help word", () => {
    for (const word of WORDS) {
      if (word.strategy === "schwingen") continue;
      const own = word.spots.filter((spot) => spot.strategy === word.strategy);
      expect(own.length, word.text).toBeGreaterThan(0);
      if (word.strategy === "merken") continue;
      for (const spot of own) expect(spot.help, word.text).toBeTruthy();
    }
  });

  it("derives ä and äu from a related word with a and au", () => {
    for (const word of WORDS) {
      for (const spot of word.spots) {
        if (spot.strategy !== "ableiten") continue;
        const letters = word.text.slice(spot.at, spot.at + spot.len);
        expect(["ä", "äu", "Ä"], word.text).toContain(letters);
        expect(spot.help!.toLowerCase(), word.text).toContain(
          letters.toLowerCase().replace("ä", "a"),
        );
      }
    }
  });
});

describe("syllabify", () => {
  it.each([
    ["Tomate", "To-ma-te"],
    ["Sonne", "Son-ne"],
    ["Katze", "Kat-ze"],
    ["Bäcker", "Bä-cker"],
    ["Fahrrad", "Fahr-rad"],
    ["Fenster", "Fens-ter"],
    ["Schmetterling", "Schmet-ter-ling"],
    ["Geburtstag", "Ge-burts-tag"],
    ["Spielplatz", "Spiel-platz"],
    ["Hubschrauber", "Hub-schrau-ber"],
    ["Straße", "Stra-ße"],
    ["Theater", "The-a-ter"],
    ["Qualle", "Qual-le"],
    ["Hund", "Hund"],
  ])("parts %s as %s", (text, parted) => {
    expect(syllabify(text).join("-")).toBe(parted);
  });
});

describe("guessSpots", () => {
  it("lengthens a word that ends with d, g or b", () => {
    expect(guessSpots("Hund")).toEqual([
      { at: 3, len: 1, strategy: "verlaengern" },
    ]);
  });

  it("lengthens a double consonant at the end", () => {
    expect(guessSpots("kommt")).toEqual([
      { at: 2, len: 2, strategy: "verlaengern" },
    ]);
  });

  it("derives ä and äu", () => {
    expect(guessSpots("Häuser")).toEqual([
      { at: 1, len: 2, strategy: "ableiten" },
    ]);
  });

  it("remembers a lengthening h and a v at the start", () => {
    expect(guessSpots("Verkehr").map((spot) => spot.strategy)).toEqual([
      "merken",
      "merken",
    ]);
  });

  it("finds no hard place in a word that is written as it sounds", () => {
    expect(guessSpots("Tomate")).toEqual([]);
  });
});

describe("parseOwn", () => {
  it("reads words from lines and with commas, each only once", () => {
    expect(parseOwn("Hund\n Fahr-rad, Hund;Wiese")).toEqual([
      "Hund",
      "Fahr-rad",
      "Wiese",
    ]);
  });

  it("leaves out what is not a word", () => {
    expect(parseOwn("a 123 Hund! x2 Mäuse -Ball-")).toEqual(["Mäuse", "Ball"]);
  });
});

describe("ownWord", () => {
  it("takes the syllables from the hyphens", () => {
    const word = ownWord("Spiel-platz");
    expect(word.text).toBe("Spielplatz");
    expect(word.syllables).toEqual(["Spiel", "platz"]);
    expect(word.strategy).toBe("schwingen");
  });

  it("guesses the syllables and the strategy of a word without hyphens", () => {
    const word = ownWord("Kleid");
    expect(word.syllables).toEqual(["Kleid"]);
    expect(word.strategy).toBe("verlaengern");
  });

  it("takes a word of the word list from there", () => {
    expect(ownWord("Hund").spots[0].help).toBe("Hun-de");
  });
});
