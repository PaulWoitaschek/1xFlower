import type { Spot, Strategy, Word } from "./words";

/** what helps after an error: a strategy, or the capital or small first letter */
export type Tip = Strategy | "gross" | "klein";

export interface Verdict {
  right: boolean;
  tip: Tip;
  /** the hard place with the error */
  spot: Spot | null;
  /** the letters of the word that are wrong or that miss */
  wrong: number[];
  /** the syllable with the first wrong letter */
  syllable: number;
}

// The letters of the target that the typed word has wrong, misses or doubles.
export function wrongLetters(typed: string, target: string): number[] {
  const n = typed.length;
  const m = target.length;
  if (!m) return [];
  const d: number[][] = [];
  for (let i = 0; i <= n; i++) {
    d.push([i]);
    for (let j = 1; j <= m; j++) {
      d[i][j] = !i
        ? j
        : Math.min(
            d[i - 1][j - 1] + (typed[i - 1] === target[j - 1] ? 0 : 1),
            d[i - 1][j] + 1,
            d[i][j - 1] + 1,
          );
    }
  }
  const wrong = new Set<number>();
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      typed[i - 1] === target[j - 1] &&
      d[i][j] === d[i - 1][j - 1]
    ) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
      wrong.add(j - 1);
      i--;
      j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      wrong.add(j - 1);
      j--;
    } else {
      // a letter too much, it stands before this letter of the target
      wrong.add(Math.min(j, m - 1));
      i--;
    }
  }
  return [...wrong].sort((a, b) => a - b);
}

export function syllableAt(word: Word, index: number): number {
  let end = 0;
  for (let s = 0; s < word.syllables.length; s++) {
    end += word.syllables[s].length;
    if (index < end) return s;
  }
  return word.syllables.length - 1;
}

const inSpot = (spot: Spot, index: number) =>
  index >= spot.at && index < spot.at + spot.len;

// Compares the typed word with the word. An error in a hard place gets the
// strategy of the place. An error in another place gets the swinging, because
// the swinging is the first strategy.
export function check(word: Word, typed: string): Verdict {
  const target = word.text;
  if (typed === target)
    return {
      right: true,
      tip: "schwingen",
      spot: null,
      wrong: [],
      syllable: 0,
    };

  if (typed.toLowerCase() === target.toLowerCase()) {
    const wrong = [...target].flatMap((ch, i) => (ch === typed[i] ? [] : [i]));
    const capital = target[wrong[0]] !== target[wrong[0]].toLowerCase();
    return {
      right: false,
      tip: capital ? "gross" : "klein",
      spot: null,
      wrong,
      syllable: syllableAt(word, wrong[0]),
    };
  }

  const wrong = wrongLetters(typed.toLowerCase(), target.toLowerCase());
  const outside = wrong.some(
    (index) => !word.spots.some((spot) => inSpot(spot, index)),
  );
  const spot = outside
    ? null
    : word.spots.find((s) => wrong.some((index) => inSpot(s, index))) || null;
  return {
    right: false,
    tip: spot ? spot.strategy : "schwingen",
    spot,
    wrong,
    syllable: syllableAt(word, wrong[0] ?? 0),
  };
}
