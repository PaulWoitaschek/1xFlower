import { TRAVELLING } from "./lists/travelling";

// The words of the orchard. The orchard practices English vocabulary. Each
// word list lives in its own file in `lists`: to add a list from a school
// book, add one file and one line to LISTS.

/** a row of a list: English, German, a picture ("" for none), other right ways */
export type Row = [en: string, de: string, pic?: string, also?: string[]];

export interface RawList {
  id: string;
  name: string;
  groups: { id: string; name: string; rows: Row[] }[];
}

export interface VocabWord {
  /** the English text, it is also the key of the fact */
  en: string;
  /** the German meaning */
  de: string;
  /** an emoji that shows the word */
  pic?: string;
  /** other right ways to write the word, for example "on your left" */
  also: string[];
  /** the id of the group, as "travelling/countries"; own words have OWN_GROUP */
  group: string;
}

export interface VocabGroup {
  /** the id with the list: "travelling/countries" */
  id: string;
  name: string;
  list: string;
  words: VocabWord[];
}

export interface VocabList {
  id: string;
  name: string;
  groups: VocabGroup[];
}

/** the group of the words from school */
export const OWN_GROUP = "own";

// The lists of the orchard. Add a new list here.
const RAW_LISTS: RawList[] = [TRAVELLING];

export const LISTS: VocabList[] = RAW_LISTS.map((raw) => ({
  id: raw.id,
  name: raw.name,
  groups: raw.groups.map((group) => {
    const id = raw.id + "/" + group.id;
    return {
      id,
      name: group.name,
      list: raw.id,
      words: group.rows.map(([en, de, pic, also]) => ({
        en,
        de,
        ...(pic ? { pic } : {}),
        also: also || [],
        group: id,
      })),
    };
  }),
}));

export const GROUPS: VocabGroup[] = LISTS.flatMap((list) => list.groups);
export const WORDS: VocabWord[] = GROUPS.flatMap((group) => group.words);
export const LIST_IDS = LISTS.map((list) => list.id);
export const GROUP_IDS = GROUPS.map((group) => group.id);

const BY_EN = new Map(WORDS.map((word) => [word.en, word]));

export const builtIn = (en: string) => BY_EN.get(en);
export const listOf = (id: string) => LISTS.find((list) => list.id === id);
export const groupOf = (id: string) => GROUPS.find((group) => group.id === id);

/** the longest English or German side of an own word */
export const OWN_TEXT_MAX = 40;
/** the most own words */
export const OWN_MAX = 200;
/** the most accepted variants of an own word, with the main one */
const VARIANTS_MAX = 5;

// The text as the child typed it, with one space between the words and one
// kind of apostrophe.
export const tidy = (text: string) =>
  text.replaceAll("’", "'").replace(/\s+/g, " ").trim();

// One entry of the child, as "apple = Apfel". The English side may hold
// variants with "/" or ",": "colour / color = Farbe". The first is the main
// one. It gives null if a side is empty or too long.
export function parseEntry(input: string): VocabWord | null {
  const at = input.indexOf("=");
  if (at < 0) return null;
  const de = tidy(input.slice(at + 1));
  const [en, ...also] = [
    ...new Set(
      input
        .slice(0, at)
        .split(/[/,]/)
        .map(tidy)
        .filter((text) => text),
    ),
  ];
  if (!en || !de || de.length > OWN_TEXT_MAX) return null;
  if (also.length >= VARIANTS_MAX) return null;
  if ([en, ...also].some((text) => text.length > OWN_TEXT_MAX)) return null;
  return { en, de, also, group: OWN_GROUP };
}

// The entry in the way that the orchard keeps it.
export function formatEntry(word: VocabWord): string {
  return [word.en, ...word.also].join(" / ") + " = " + word.de;
}

// The entries from school, one per line or parted by semicolons. It keeps the
// valid ones, once per English text.
export function parseOwn(input: string): string[] {
  const seen = new Set<string>();
  const own: string[] = [];
  for (const line of input.split(/[\n;]+/)) {
    const word = parseEntry(line);
    if (!word || seen.has(word.en)) continue;
    seen.add(word.en);
    own.push(formatEntry(word));
    if (own.length >= OWN_MAX) break;
  }
  return own;
}

// A word of the child, from an entry. It gives null for a bad entry.
export const ownWord = (entry: string): VocabWord | null => parseEntry(entry);
