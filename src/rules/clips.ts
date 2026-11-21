import { WORDS, type Word } from "./words";

// The voice files of the game. A clip is one text that the voice speaks. The
// script `scripts/voice.ts` makes a sound file for each clip, and the game
// plays it. The name of the file comes from the text, so no list of the files
// is needed: a new word needs no more than a run of the script.

export type Lang = "de" | "en";

/** how the voice speaks the text: as it stands, or syllable by syllable */
export type Style = "plain" | "swing";

export interface Clip {
  lang: Lang;
  style: Style;
  /** the text, a text to swing has a hyphen between the syllables */
  text: string;
}

export const clipKey = (clip: Clip) =>
  clip.lang + "/" + clip.style + "/" + clip.text;

// A short number of a text (FNV-1a). It keeps two texts apart that get the
// same readable name, as "Essen" and "essen".
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

// The readable start of a file name, so that a person finds the file of a word.
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => UMLAUTS[ch])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);

/** the place of the sound file in the folder `audio`, without the ending */
export const clipPath = (clip: Clip) =>
  clip.lang + "/" + slug(clip.text) + "-" + hash(clipKey(clip));

/** the help word as the voice reads it, without the marks of the syllables */
export const spoken = (help: string) => help.replaceAll("-", "");

const plain = (text: string): Clip => ({ lang: "de", style: "plain", text });

/** the clip that speaks the word syllable by syllable, a short word has none */
export const swingClip = (syllables: string[]): Clip | null =>
  syllables.length > 1
    ? { lang: "de", style: "swing", text: syllables.join("-") }
    : null;

// All that the voice says about a word of the pond: the word, its sentence,
// the longer or the related word, and the word in syllables. The note of a
// word to remember stands only on the page.
export function wordClips(word: Word): Clip[] {
  const clips = [plain(word.text)];
  if (word.sentence) clips.push(plain(word.sentence));
  for (const spot of word.spots)
    if (spot.help && spot.strategy !== "merken")
      clips.push(plain(spoken(spot.help)));
  const swing = swingClip(word.syllables);
  if (swing) clips.push(swing);
  return clips;
}

/** each clip of the game one time */
export const CLIPS: Clip[] = [
  ...new Map(
    WORDS.flatMap(wordClips).map((clip) => [clipKey(clip), clip]),
  ).values(),
];

const KEYS = new Set(CLIPS.map(clipKey));

/** Tells if the game has a sound file for the clip. The own words have none. */
export const hasClip = (clip: Clip) => KEYS.has(clipKey(clip));
