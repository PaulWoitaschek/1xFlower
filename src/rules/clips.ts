import { WORDS as POND_WORDS } from "./words";
import { WORDS as VOCAB_WORDS } from "./vocab";

// The recordings of the voice. A voice of ElevenLabs reads each fixed text
// once, with the script `scripts/record.ts`, and the page plays the
// recording. Own words have no recording, the voice of the browser reads them.

export type Lang = "de" | "en";

/** the texts that the pond reads: the word, its sentence and the help word */
export function pondTexts(): string[] {
  return POND_WORDS.flatMap((word) => [
    word.text,
    ...(word.sentence ? [word.sentence] : []),
    ...word.spots.flatMap((spot) =>
      spot.help && spot.strategy !== "merken"
        ? [spot.help.replaceAll("-", "")]
        : [],
    ),
  ]);
}

/** the texts that the orchard reads: the English words */
export const orchardTexts = (): string[] => VOCAB_WORDS.map((word) => word.en);

/** a word in syllables as the voice gets it, as "Scho-ko-la-de" */
export const swingText = (syllables: string[]) => syllables.join("-");

// The words of the pond that the voice says syllable by syllable. A word of
// one syllable has nothing to swing.
export function swingTexts(): string[] {
  return [
    ...new Set(
      POND_WORDS.filter((word) => word.syllables.length > 1).map((word) =>
        swingText(word.syllables),
      ),
    ),
  ];
}

/** all texts with a recording, each once */
export function clipTexts(): Record<Lang, string[]> {
  return {
    de: [...new Set(pondTexts())],
    en: [...new Set(orchardTexts())],
  };
}

// The name of the file of a text: a short hash, the same in the script and
// in the page (FNV-1a over the UTF-16 units).
export function clipName(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** the path of the recording, relative to the page */
export const clipPath = (lang: Lang, text: string) =>
  "voice/" + lang + "/" + clipName(text) + ".mp3";

// The path of the recording of a word in syllables, without the ending:
// ".mp3" is the sound, and ".json" lists the second where each syllable starts.
export const swingPath = (text: string) => "voice/swing/" + clipName(text);
