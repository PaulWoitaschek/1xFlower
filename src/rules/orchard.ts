import { miss, see, type Play } from "./answer";
import type { Fact, Garden, Stage } from "./garden";
import { pickWeighted, type Queue } from "./pick";
import {
  arrives,
  grow,
  nextResident,
  tipRight,
  wordWeight,
  type PondRight,
  type Resident,
  type TipRight,
} from "./pond";
import { wrongLetters } from "./spell";
import {
  builtIn,
  GROUP_IDS,
  LIST_IDS,
  groupOf,
  ownWord,
  tidy,
  WORDS,
  type VocabWord,
} from "./vocab";

// The orchard practices English words. Each word is a fruit tree, and it grows
// like a lily of the pond: the bud and the bloom each come on a later day. The
// task gets harder with the level of the tree.

export interface Orchard {
  /** the trees, by the English text of the word */
  facts: Record<string, Fact>;
  /** the ids of the chosen lists, see LISTS */
  lists: string[];
  /** the ids of the chosen groups, as "travelling/countries" */
  groups: string[];
  /** the words from school, as "apple = Apfel", see parseEntry */
  own: string[];
  /** the round asks only the words from school */
  onlyOwn: boolean;
  /** level 3 and 4 ask to type the word; else the child chooses it */
  write: boolean;
}

/** typing takes longer than a number, so a round is short */
export const ORCHARD_ROUND = 10;
/** the options of a choice task, with the right one */
export const OPTIONS = 4;

export function freshOrchard(): Orchard {
  return {
    facts: {},
    lists: [...LIST_IDS],
    groups: [...GROUP_IDS],
    own: [],
    onlyOwn: false,
    write: true,
  };
}

// Gardens saved before the orchard existed get a new orchard on the first visit.
export function orchardOf(garden: Garden): Orchard {
  return (garden.orchard ||= freshOrchard());
}

// Chooses or drops a list. A list that comes back brings all its groups.
export function setList(orchard: Orchard, id: string, on: boolean) {
  orchard.lists = orchard.lists.filter((list) => list !== id);
  if (!on) return;
  orchard.lists.push(id);
  const ids = LIST_IDS.includes(id)
    ? GROUP_IDS.filter((group) => group.startsWith(id + "/"))
    : [];
  orchard.groups = [...new Set([...orchard.groups, ...ids])];
}

// The words from school, without the bad entries.
const ownWords = (orchard: Orchard): VocabWord[] =>
  orchard.own.flatMap((entry) => ownWord(entry) || []);

// The words that the orchard asks: the words from school and the words of the
// chosen lists and groups. An own word wins over a built-in word with the same
// English text. The orchard is never empty.
export function orchardWords(orchard: Orchard): VocabWord[] {
  const own = ownWords(orchard);
  if (orchard.onlyOwn && own.length) return own;
  const texts = new Set(own.map((word) => word.en));
  const all = [
    ...own,
    ...WORDS.filter(
      (word) =>
        orchard.groups.includes(word.group) &&
        orchard.lists.includes(groupOf(word.group)!.list) &&
        !texts.has(word.en),
    ),
  ];
  return all.length ? all : WORDS;
}

// The word of a tree. An own word wins over a built-in one. A word that is
// gone (the child removed it from the own words) gives undefined.
export function wordOf(orchard: Orchard, en: string): VocabWord | undefined {
  return ownWords(orchard).find((word) => word.en === en) || builtIn(en);
}

export function treeStage(orchard: Orchard, key: string): Stage {
  const fact = orchard.facts[key];
  if (!fact || !fact.seen) return "u";
  return fact.wilt ? "wilt" : (("l" + fact.lvl) as Stage);
}

// The ripe trees: level 4 and not wilted. This is what the diary counts.
export function ripeTrees(orchard: Orchard): number {
  return Object.keys(orchard.facts).filter(
    (key) => treeStage(orchard, key) === "l4",
  ).length;
}

/** meaning: see and hear English, choose German; choose: see German, choose English; write: see German, type English */
export type Task = "meaning" | "choose" | "write";

// The task of a tree grows with its level. A wilted tree has level 0 again.
export function taskOf(orchard: Orchard, key: string): Task {
  const lvl = orchard.facts[key]?.lvl ?? 0;
  if (lvl < 2) return "meaning";
  if (lvl === 2) return "choose";
  return orchard.write ? "write" : "choose";
}

// The text of the word that a choice task shows as an option.
export const optionText = (word: VocabWord, task: Task): string =>
  task === "meaning" ? word.de : word.en;

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const forms = (word: VocabWord) => [word.en, ...word.also].map(tidy);

// The options of a choice task: the right one and 3 other texts, in a random
// order. The others come from the words that the orchard asks, the words of
// the same group first, and from all built-in words if there are too few.
// No two options have the same text, and no other option is also a right
// answer (like "on your left" for "on the left").
export function optionsOf(
  orchard: Orchard,
  word: VocabWord,
  task: "meaning" | "choose",
  random = Math.random,
): string[] {
  const right = optionText(word, task);
  const taken = new Set([right]);
  const rightForms = forms(word);
  const fits = (other: VocabWord) =>
    !forms(other).some((form) => rightForms.includes(form)) &&
    !taken.has(optionText(other, task));
  const pool = orchardWords(orchard);
  const near = shuffle(
    pool.filter((other) => other.group === word.group),
    random,
  );
  const far = shuffle(
    pool.filter((other) => other.group !== word.group),
    random,
  );
  const rest = shuffle(WORDS, random);
  const options = [right];
  for (const other of [...near, ...far, ...rest]) {
    if (options.length >= OPTIONS) break;
    if (!fits(other)) continue;
    taken.add(optionText(other, task));
    options.push(optionText(other, task));
  }
  return shuffle(options, random);
}

export function pickOrchard(
  orchard: Orchard,
  queue: Queue,
  today: number,
  random = Math.random,
): string {
  return pickWeighted(
    orchardWords(orchard).map((word) => word.en),
    queue,
    (key) => wordWeight(orchard.facts[key], today),
    random,
  );
}

export type TreeRight = PondRight;

export interface ChoiceWrong {
  right: false;
}

// The answer to a choice task. There is no second try: a wrong choice wilts
// the tree and the word comes back soon. A right choice lets it grow.
export function chooseWord(
  garden: Garden,
  play: Play,
  word: VocabWord,
  task: "meaning" | "choose",
  chosen: string,
  today: number,
): TreeRight | ChoiceWrong {
  const fact = see(orchardOf(garden).facts, play, word.en);
  if (chosen !== optionText(word, task)) return miss(fact, play, word.en);
  return grow(garden, play, fact, today);
}

export interface Verdict {
  right: boolean;
  /** only a difference of the capital letters: "gross" or "klein" tells which */
  tip: "gross" | "klein" | null;
  /** the accepted text that is nearest to the typed text */
  target: string;
  /** the letters of the target that are wrong or that miss, to mark them */
  wrong: number[];
}

// Compares the typed text with the word and its other right ways. Spaces and
// the kind of apostrophe do not matter, but the capital letters do.
export function check(word: VocabWord, typed: string): Verdict {
  const text = tidy(typed);
  const targets = forms(word);
  const same = targets.find((target) => target === text);
  if (same) return { right: true, tip: null, target: same, wrong: [] };

  const low = text.toLowerCase();
  const alike = targets.find((target) => target.toLowerCase() === low);
  if (alike) {
    const wrong = [...alike].flatMap((ch, i) => (ch === text[i] ? [] : [i]));
    const capital = alike[wrong[0]] !== alike[wrong[0]].toLowerCase();
    return {
      right: false,
      tip: capital ? "gross" : "klein",
      target: alike,
      wrong,
    };
  }

  let best: Verdict | null = null;
  for (const target of targets) {
    const wrong = wrongLetters(low, target.toLowerCase());
    if (!best || wrong.length < best.wrong.length)
      best = { right: false, tip: null, target, wrong };
  }
  return best!;
}

export interface TreeWrong {
  right: false;
  verdict: Verdict;
}

// The first try of a write task. A right text lets the tree grow. A wrong text
// changes nothing yet: the child gets the verdict and a second try.
export function tryWrite(
  garden: Garden,
  play: Play,
  word: VocabWord,
  typed: string,
  today: number,
): TreeRight | TreeWrong {
  const fact = see(orchardOf(garden).facts, play, word.en);
  const verdict = check(word, typed);
  if (!verdict.right) return { right: false, verdict };
  return grow(garden, play, fact, today);
}

// The second try of a write task. A right text brings TIP_POINTS and the word
// comes back soon. A wrong text wilts the tree, and the page shows the
// solution to copy.
export function retryWrite(
  garden: Garden,
  play: Play,
  word: VocabWord,
  typed: string,
): TipRight | TreeWrong {
  const fact = orchardOf(garden).facts[word.en];
  const verdict = check(word, typed);
  if (!verdict.right) {
    miss(fact, play, word.en);
    return { right: false, verdict };
  }
  return tipRight(garden, play, fact, word.en);
}

/** the animals of the orchard, they come with the ripe trees */
export const ORCHARD_RESIDENTS: Resident[] = [
  { name: "Igel", pic: "🦔", at: 2 },
  { name: "Biene", pic: "🐝", at: 5 },
  { name: "Schmetterling", pic: "🦋", at: 9 },
  { name: "Eichhörnchen", pic: "🐿️", at: 14 },
  { name: "Vogel", pic: "🐦", at: 20 },
  { name: "Fuchs", pic: "🦊", at: 28 },
  { name: "Eule", pic: "🦉", at: 38 },
  { name: "Reh", pic: "🦌", at: 50 },
];

export const nextOrchardResident = (ripe: number) =>
  nextResident(ripe, ORCHARD_RESIDENTS);

// The animal that comes with this number of ripe trees.
export const orchardArrives = (ripe: number) =>
  arrives(ripe, ORCHARD_RESIDENTS);
