// The background music: a slow jazz swing in F major. This file only writes the notes, src/ui/music.ts plays them.

export const BPM = 100;
/** where the second eighth note of a beat sits, a straight eighth would be at 0.5 */
export const SWING = 0.64;

export type Voice =
  "bass" | "keys" | "vibe" | "ride" | "hat" | "kick" | "brush";

export interface Note {
  voice: Voice;
  /** beats from the start of the bar */
  at: number;
  /** length in beats */
  len: number;
  /** the pitch as a MIDI number, 0 for the drums */
  midi: number;
  /** loudness from 0 to 1 */
  vol: number;
}

interface Chord {
  /** the bass root */
  root: number;
  /** 3 for a minor third, 4 for a major third */
  third: number;
  /** a voicing without the root for the electric piano */
  keys: number[];
}

export const CHORDS: Record<string, Chord> = {
  Fmaj7: { root: 41, third: 4, keys: [57, 60, 64, 67] },
  F6: { root: 41, third: 4, keys: [57, 60, 62, 67] },
  Dm7: { root: 38, third: 3, keys: [53, 57, 60, 64] },
  Gm7: { root: 43, third: 3, keys: [53, 57, 58, 62] },
  C7: { root: 36, third: 4, keys: [52, 57, 58, 62] },
  Am7: { root: 45, third: 3, keys: [55, 59, 60, 64] },
  D7: { root: 38, third: 4, keys: [54, 59, 60, 64] },
  Bbmaj7: { root: 46, third: 4, keys: [57, 60, 62, 65] },
  Eb7: { root: 39, third: 4, keys: [55, 60, 61, 65] },
};

/** the chords of each bar with their length in beats */
export const FORM: [string, number][][] = [
  [["Fmaj7", 4]],
  [["Dm7", 4]],
  [["Gm7", 4]],
  [["C7", 4]],
  [["Am7", 4]],
  [["D7", 4]],
  [["Gm7", 4]],
  [["C7", 4]],
  [["Bbmaj7", 4]],
  [["Eb7", 4]],
  [["Am7", 4]],
  [["D7", 4]],
  [["Gm7", 4]],
  [["C7", 4]],
  [
    ["F6", 2],
    ["D7", 2],
  ],
  [
    ["Gm7", 2],
    ["C7", 2],
  ],
];

export const BASS_RANGE = [34, 55];
export const VIBE_RANGE = [65, 81];

/** the pitches that sound good over a chord */
export function chordTones(name: string): Set<number> {
  const chord = CHORDS[name];
  return new Set([chord.root, ...chord.keys].map((m) => m % 12));
}

const pick = <T>(list: T[], rand: () => number) =>
  list[Math.floor(rand() * list.length)];

/** an eighth note of the bar, 0 to 7, as a swung time in beats */
const eighth = (k: number) => Math.floor(k / 2) + (k % 2 ? SWING : 0);

const WALKS = [
  (third: number) => [0, third, 7],
  (third: number) => [0, 2, third],
  () => [0, 12, 7],
  (third: number) => [0, 7, third + 12],
];

const COMP4: [number, number][][] = [
  [
    [0, 1.2],
    [1 + SWING, 0.5],
  ],
  [
    [SWING, 0.5],
    [2 + SWING, 1.2],
  ],
  [
    [1, 0.6],
    [3, 0.6],
  ],
  [[0, 2.6]],
  [
    [1 + SWING, 0.4],
    [3, 0.9],
  ],
];

const COMP2: [number, number][][] = [[[0, 1.3]], [[SWING, 1]], [[1, 0.6]]];

/** the eighth notes on which the vibraphone plays in a bar */
const LICKS = [
  [0, 1, 2, 3],
  [1, 2, 4],
  [0, 3, 5],
  [2, 3, 4, 5, 6],
  [1, 3, 4, 6],
  [0, 2, 3],
];

/** the notes of the bars, one after the other, without an end */
export function* tune(rand: () => number = Math.random): Generator<Note[]> {
  let melody = 72;
  for (let bar = 0; ; bar++) {
    const chords = FORM[bar % FORM.length];
    const following = FORM[(bar + 1) % FORM.length][0][0];
    const notes: Note[] = [];
    const add = (n: Note) => notes.push(n);

    let at = 0;
    chords.forEach(([name, beats], i) => {
      const chord = CHORDS[name];
      const next = CHORDS[i + 1 < chords.length ? chords[i + 1][0] : following];

      // walking bass: chord tones, then a half step into the next root
      const walk = beats === 4 ? pick(WALKS, rand)(chord.third) : [0];
      const approach = next.root + (rand() < 0.5 ? 1 : -1);
      [...walk, approach - chord.root].forEach((step, b) => {
        const midi = chord.root + step;
        add({
          voice: "bass",
          at: at + b,
          len: 0.92,
          midi: midi > BASS_RANGE[1] ? midi - 12 : midi,
          vol: b === 0 ? 1 : 0.85,
        });
      });

      // electric piano
      for (const [hit, len] of pick(beats === 4 ? COMP4 : COMP2, rand)) {
        const vol = 0.75 + rand() * 0.25;
        for (const midi of chord.keys) {
          add({ voice: "keys", at: at + hit, len, midi, vol });
        }
      }
      at += beats;
    });

    // the vibraphone plays in the first bars of each four, then rests
    const inPhrase = bar % 4;
    if (inPhrase < 2 || (inPhrase === 2 && rand() < 0.4)) {
      const slots = pick(LICKS, rand);
      slots.forEach((k, i) => {
        const time = eighth(k);
        const name =
          chords.length > 1 && time >= 2 ? chords[1][0] : chords[0][0];
        const tones = chordTones(name);
        const options: number[] = [];
        for (let m = VIBE_RANGE[0]; m <= VIBE_RANGE[1]; m++) {
          if (tones.has(m % 12) && m !== melody) options.push(m);
        }
        // mostly small steps, and back towards the middle near the edges
        const up =
          melody > 77
            ? rand() < 0.2
            : melody < 69
              ? rand() < 0.8
              : rand() < 0.5;
        const way = options.filter((m) => (up ? m > melody : m < melody));
        const near = (way.length ? way : options).sort(
          (a, b) => Math.abs(a - melody) - Math.abs(b - melody),
        );
        melody = near[rand() < 0.7 ? 0 : Math.min(1, near.length - 1)];
        const last = i === slots.length - 1;
        add({
          voice: "vibe",
          at: time,
          len: last ? 1.5 : 0.5,
          midi: melody,
          vol: (k % 2 ? 0.7 : 0.9) + rand() * 0.1,
        });
      });
    }

    // drums: the ride cymbal swings, the hi-hat closes on 2 and 4
    for (const [time, vol] of [
      [0, 0.75],
      [1, 1],
      [1 + SWING, 0.55],
      [2, 0.75],
      [3, 1],
      [3 + SWING, 0.55],
    ]) {
      add({ voice: "ride", at: time, len: 0.5, midi: 0, vol });
    }
    for (const time of [1, 3]) {
      add({ voice: "hat", at: time, len: 0.1, midi: 0, vol: 1 });
    }
    for (let b = 0; b < 4; b++) {
      add({ voice: "kick", at: b, len: 0.3, midi: 0, vol: b === 0 ? 1 : 0.6 });
    }
    for (const k of [3, 5, 7]) {
      if (rand() < 0.3) {
        add({ voice: "brush", at: eighth(k), len: 0.2, midi: 0, vol: 0.6 });
      }
    }

    yield notes;
  }
}
