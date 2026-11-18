import { miss, score, see, type Play } from "./answer";
import { canGrow, type Fact, type Garden, type Stage } from "./garden";
import { pickWeighted, type Queue } from "./pick";
import { check, type Verdict } from "./spell";
import { thirsty, water } from "./thirst";
import {
  builtIn,
  ownWord,
  STRATEGIES,
  WORDS,
  type Strategy,
  type Word,
} from "./words";

// The pond practices the spelling. Each word is a water lily: a word that is
// right at the first try lets it grow, and the bud and the bloom each come on
// a later day, as in the garden. After an error the child gets a tip with a
// strategy and a second try.

export interface Pond {
  facts: Record<string, Fact>;
  levels: number[];
  strategies: Strategy[];
  /** the words from school, with hyphens between the syllables if the child gave them */
  own: string[];
  /** the round asks only the words from school */
  onlyOwn: boolean;
}

/** typing takes longer than a number, so a round is short */
export const POND_ROUND = 10;
/** points for a word that is right with the tip */
export const TIP_POINTS = 5;

export function freshPond(): Pond {
  return {
    facts: {},
    levels: [1],
    strategies: [...STRATEGIES],
    own: [],
    onlyOwn: false,
  };
}

// Gardens saved before the pond existed get a new pond on the first visit.
export function pondOf(garden: Garden): Pond {
  return (garden.pond ||= freshPond());
}

// The words that the pond asks: the words from school and the words of the
// chosen levels and strategies. The pond is never empty.
export function pondWords(pond: Pond): Word[] {
  const own = pond.own.map(ownWord);
  if (pond.onlyOwn && own.length) return own;
  const texts = new Set(own.map((word) => word.text));
  const all = [
    ...own,
    ...WORDS.filter(
      (word) =>
        pond.levels.includes(word.level) &&
        pond.strategies.includes(word.strategy) &&
        !texts.has(word.text),
    ),
  ];
  return all.length ? all : WORDS.filter((word) => word.level === 1);
}

export function wordOf(pond: Pond, text: string): Word {
  const marked = pond.own.find((own) => own.replaceAll("-", "") === text);
  return marked ? ownWord(marked) : builtIn(text) || ownWord(text);
}

export function lilyStage(pond: Pond, key: string): Stage {
  const fact = pond.facts[key];
  if (!fact || !fact.seen) return "u";
  return fact.wilt ? "wilt" : (("l" + fact.lvl) as Stage);
}

export function openLilies(pond: Pond): number {
  return Object.keys(pond.facts).filter((key) => lilyStage(pond, key) === "l4")
    .length;
}

// Shared with the orchard. Errors come back often. A bloom that the child did not write for some days
// comes before the lilies that grow.
export function wordWeight(fact: Fact | undefined, today: number): number {
  if (!fact || !fact.seen) return 2.5;
  if (fact.wilt) return 12 + Math.min(fact.wrong, 5) * 2;
  if (thirsty(fact, today)) return 8;
  if (!canGrow(fact, today)) return 0.5;
  return [7, 5, 3, 1.4][fact.lvl];
}

export function pickPond(
  pond: Pond,
  queue: Queue,
  today: number,
  random = Math.random,
): string {
  return pickWeighted(
    pondWords(pond).map((word) => word.text),
    queue,
    (key) => wordWeight(pond.facts[key], today),
    random,
  );
}

export interface PondRight {
  right: true;
  points: number;
  /** level of the lily before this word */
  before: number;
  bloom: boolean;
  /** the lily did not grow, it rests until a later day */
  rest: boolean;
  /** a wilted lily is green again */
  freshAgain: boolean;
  /** a bloom that waited for some days stays open for longer */
  quenched: boolean;
}

export interface PondWrong {
  right: false;
  verdict: Verdict;
}

// The first try of a word. A right word lets the lily grow. A wrong word
// changes nothing yet: the child gets a tip and a second try.
export function tryWord(
  garden: Garden,
  play: Play,
  word: Word,
  typed: string,
  today: number,
): PondRight | PondWrong {
  const fact = see(pondOf(garden).facts, play, word.text);
  const verdict = check(word, typed);
  if (!verdict.right) return { right: false, verdict };
  return grow(garden, play, fact, today);
}

// A right first answer lets the plant grow, if it can. The orchard uses it too.
export function grow(
  garden: Garden,
  play: Play,
  fact: Fact,
  today: number,
): PondRight {
  const before = fact.lvl;
  const wasWilt = fact.wilt;
  const grows = canGrow(fact, today);
  fact.right++;
  if (grows) {
    fact.lvl++;
    fact.grown = today;
  }
  if (fact.lvl >= 2) fact.wilt = false;
  const points = score(garden, play, false);
  const bloom = before === 3 && fact.lvl === 4;
  if (bloom) play.round.blooms++;
  return {
    right: true,
    points,
    before,
    bloom,
    rest: !grows && before < 4,
    freshAgain: wasWilt && !fact.wilt,
    quenched: fact.lvl === 4 && water(fact, today, bloom),
  };
}

export interface TipRight {
  right: true;
  points: number;
}

// The second try, after the tip. A right word brings some points and comes
// back soon, so that the child writes it once without the tip. A wrong word
// wilts the lily.
export function retryWord(
  garden: Garden,
  play: Play,
  word: Word,
  typed: string,
): TipRight | PondWrong {
  const key = word.text;
  const fact = pondOf(garden).facts[key];
  const verdict = check(word, typed);
  if (!verdict.right) {
    miss(fact, play, key);
    return { right: false, verdict };
  }
  return tipRight(garden, play, fact, key);
}

// A right second try: some points, and the word comes back soon. The orchard
// uses it too.
export function tipRight(
  garden: Garden,
  play: Play,
  fact: Fact,
  key: string,
): TipRight {
  fact.wrong++;
  play.streak = 0;
  garden.points += TIP_POINTS;
  play.round.points += TIP_POINTS;
  play.round.marks.push("tip");
  play.comeback = play.comeback.filter((c) => c.key !== key);
  play.comeback.push({ key, due: play.qn + 3 });
  return { right: true, points: TIP_POINTS };
}

export interface Resident {
  name: string;
  pic: string;
  /** the open lilies (or ripe trees) that bring the animal */
  at: number;
}

// Open lilies bring animals to the pond.
export const RESIDENTS: Resident[] = [
  { name: "Frosch", pic: "🐸", at: 2 },
  { name: "Ente", pic: "🦆", at: 5 },
  { name: "Fisch", pic: "🐟", at: 9 },
  { name: "Schildkröte", pic: "🐢", at: 14 },
  { name: "Schwan", pic: "🦢", at: 20 },
  { name: "Otter", pic: "🦦", at: 28 },
  { name: "Biber", pic: "🦫", at: 38 },
  { name: "Flamingo", pic: "🦩", at: 50 },
];

export function nextResident(
  open: number,
  residents = RESIDENTS,
): {
  resident: Resident | null;
  need: number;
} {
  const resident = residents.find((r) => r.at > open) || null;
  return { resident, need: resident ? resident.at - open : 0 };
}

// The animal that comes with this number of open lilies.
export const arrives = (open: number, residents = RESIDENTS) =>
  residents.find((r) => r.at === open) || null;
