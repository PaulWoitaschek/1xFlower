import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clipName, clipPath, clipTexts, pondTexts } from "./clips";
import { WORDS } from "./words";

const dir = new URL("../../public/", import.meta.url);

describe("the recordings", () => {
  it("exist for each fixed text, run scripts/record.ts after a change to the words", () => {
    const missing = Object.entries(clipTexts()).flatMap(([lang, texts]) =>
      texts.filter(
        (text) => !existsSync(new URL(clipPath(lang as "de", text), dir)),
      ),
    );
    expect(missing).toEqual([]);
  });

  it("have no file without a text", () => {
    for (const [lang, texts] of Object.entries(clipTexts())) {
      const files = readdirSync(new URL("voice/" + lang + "/", dir));
      expect(files.sort()).toEqual(
        texts.map((text) => clipName(text) + ".mp3").sort(),
      );
    }
  });

  it("read the word, the sentence and the help word of the pond", () => {
    const word = WORDS.find((w) =>
      w.spots.some((s) => s.strategy === "verlaengern"),
    )!;
    const help = word.spots.find((s) => s.strategy === "verlaengern")!.help!;
    expect(pondTexts()).toEqual(
      expect.arrayContaining([
        word.text,
        word.sentence,
        help.replaceAll("-", ""),
      ]),
    );
  });

  it("do not read the note of a word to remember", () => {
    const notes = WORDS.flatMap((w) =>
      w.spots.flatMap((s) =>
        s.strategy === "merken" && s.help ? [s.help] : [],
      ),
    );
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(pondTexts()).not.toContain(note);
  });

  it("name each file with a short hash", () => {
    expect(clipName("Fahrrad")).toMatch(/^[0-9a-f]{8}$/);
    expect(clipName("Fahrrad")).not.toBe(clipName("fahrrad"));
  });
});
