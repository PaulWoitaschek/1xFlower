import { describe, expect, it } from "vitest";
import { check, wrongLetters } from "./spell";
import { builtIn, ownWord } from "./words";

const word = (text: string) => builtIn(text)!;

describe("wrongLetters", () => {
  it("finds a wrong letter", () => {
    expect(wrongLetters("hunt", "hund")).toEqual([3]);
  });

  it("finds a letter that misses", () => {
    expect(wrongLetters("tomte", "tomate")).toEqual([3]);
  });

  it("finds a letter too much at the end", () => {
    expect(wrongLetters("hundt", "hund")).toEqual([3]);
  });

  it("finds nothing in the right word", () => {
    expect(wrongLetters("hund", "hund")).toEqual([]);
  });
});

describe("check", () => {
  it("takes the right word", () => {
    expect(check(word("Hund"), "Hund").right).toBe(true);
  });

  it("lengthens after a wrong letter at the end", () => {
    const verdict = check(word("Hund"), "Hunt");
    expect(verdict.right).toBe(false);
    expect(verdict.tip).toBe("verlaengern");
    expect(verdict.spot?.help).toBe("Hun-de");
    expect(verdict.wrong).toEqual([3]);
  });

  it("lengthens after a single consonant in place of a double one", () => {
    expect(check(word("kommt"), "komt").tip).toBe("verlaengern");
  });

  it("derives after e in place of ä", () => {
    const verdict = check(word("Häuser"), "Heuser");
    expect(verdict.tip).toBe("ableiten");
    expect(verdict.spot?.help).toBe("Haus");
  });

  it("remembers after an error in a place without a rule", () => {
    expect(check(word("Vogel"), "Fogel").tip).toBe("merken");
  });

  it("swings after a letter that misses", () => {
    const verdict = check(word("Tomate"), "Tomte");
    expect(verdict.tip).toBe("schwingen");
    expect(verdict.spot).toBeNull();
    expect(verdict.syllable).toBe(1);
  });

  it("swings first when an error is outside the hard places", () => {
    expect(check(word("Hund"), "Hnt").tip).toBe("schwingen");
  });

  it("swings after a missing letter between two syllables", () => {
    const verdict = check(word("Fahrrad"), "Fahrad");
    expect(verdict.tip).toBe("schwingen");
  });

  it("takes the strategy of the place with the error, not of the first place", () => {
    expect(check(word("Fahrrad"), "Fahrrat").tip).toBe("verlaengern");
    expect(check(word("Fahrrad"), "Farrad").tip).toBe("merken");
  });

  it("asks for a capital letter", () => {
    const verdict = check(word("Hund"), "hund");
    expect(verdict.right).toBe(false);
    expect(verdict.tip).toBe("gross");
    expect(verdict.wrong).toEqual([0]);
  });

  it("asks for a small letter", () => {
    expect(check(word("schnell"), "Schnell").tip).toBe("klein");
  });

  it("gives a word of the child the guessed strategy", () => {
    expect(check(ownWord("Kleid"), "Kleit").tip).toBe("verlaengern");
  });
});
