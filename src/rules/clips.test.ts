import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  CLIPS,
  clipPath,
  hasClip,
  swingClip,
  wordClips,
  type Clip,
} from "./clips";
import { builtIn } from "./words";

const DIR = "public/audio/";

const texts = (clips: Clip[], style: Clip["style"]) =>
  clips.filter((clip) => clip.style === style).map((clip) => clip.text);

test("the voice says the word, its sentence, the help word and the syllables", () => {
  const clips = wordClips(builtIn("Hund")!);
  expect(texts(clips, "plain")).toEqual([
    "Hund",
    "Der Hund bellt laut.",
    "Hunde",
  ]);
  // a word of one syllable has nothing to swing
  expect(texts(clips, "swing")).toEqual([]);
  expect(texts(wordClips(builtIn("Schokolade")!), "swing")).toEqual([
    "Scho-ko-la-de",
  ]);
});

test("the note of a word to remember is not spoken", () => {
  expect(texts(wordClips(builtIn("seit")!), "plain")).toEqual([
    "seit",
    "Ich lerne seit einer Stunde.",
  ]);
});

test("an own word has no sound file", () => {
  expect(hasClip({ lang: "de", style: "plain", text: "Hund" })).toBe(true);
  expect(hasClip({ lang: "de", style: "plain", text: "Dinosaurier" })).toBe(
    false,
  );
  expect(hasClip(swingClip(["Di", "no", "sau", "ri", "er"])!)).toBe(false);
});

test("each clip has its own file name", () => {
  expect(new Set(CLIPS.map(clipPath)).size).toBe(CLIPS.length);
  // two texts that differ only in the case must not share a file
  const lower = CLIPS.map((clip) => clipPath(clip).toLowerCase());
  expect(new Set(lower).size).toBe(CLIPS.length);
});

// When this test fails, run `npm run voice`.
test("each clip has its sound file, and no file is left over", () => {
  const needed = CLIPS.flatMap((clip) =>
    clip.style === "swing"
      ? [clipPath(clip) + ".mp3", clipPath(clip) + ".json"]
      : [clipPath(clip) + ".mp3"],
  );
  const present = (readdirSync(DIR, { recursive: true }) as string[])
    .map((name) => name.replaceAll("\\", "/"))
    .filter((name) => name.includes("."));
  expect(needed.filter((name) => !existsSync(DIR + name))).toEqual([]);
  expect(present.filter((name) => !needed.includes(name))).toEqual([]);
});

test("a word to swing knows the start of each syllable", () => {
  for (const clip of CLIPS.filter((clip) => clip.style === "swing")) {
    const starts: number[] = JSON.parse(
      readFileSync(DIR + clipPath(clip) + ".json", "utf8"),
    );
    expect(starts, clip.text).toHaveLength(clip.text.split("-").length);
    expect(
      [...starts].sort((a, b) => a - b),
      clip.text,
    ).toEqual(starts);
  }
});
