import { describe, expect, it } from "vitest";
import {
  BASS_RANGE,
  chordTones,
  CHORDS,
  FORM,
  tune,
  VIBE_RANGE,
  type Note,
} from "./tune";

// the same random numbers each time
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function bars(count: number, seed: number): Note[][] {
  const song = tune(seeded(seed));
  return Array.from({ length: count }, () => song.next().value!);
}

/** the chord that sounds at a beat of a bar */
function chordAt(bar: number, at: number): string {
  let start = 0;
  for (const [name, beats] of FORM[bar % FORM.length]) {
    if (at < start + beats) return name;
    start += beats;
  }
  throw new Error("beat out of the bar");
}

const seeds = [1, 2, 3, 42, 1234];
const song = seeds.map((seed) => bars(FORM.length * 3, seed));

describe("tune", () => {
  it("has four beats in each bar of the form", () => {
    for (const bar of FORM) {
      expect(bar.reduce((sum, [, beats]) => sum + beats, 0)).toBe(4);
    }
  });

  it("puts each note inside its bar", () => {
    for (const note of song.flat(2)) {
      expect(note.at).toBeGreaterThanOrEqual(0);
      expect(note.at).toBeLessThan(4);
      expect(note.vol).toBeGreaterThan(0);
      expect(note.vol).toBeLessThanOrEqual(1);
    }
  });

  it("walks the bass on each beat and starts each chord on its root", () => {
    for (const bars of song) {
      bars.forEach((notes, bar) => {
        const bass = notes.filter((n) => n.voice === "bass");
        expect(bass.map((n) => n.at)).toEqual([0, 1, 2, 3]);
        let start = 0;
        for (const [name, beats] of FORM[bar % FORM.length]) {
          const first = bass.find((n) => n.at === start)!;
          expect(first.midi % 12).toBe(CHORDS[name].root % 12);
          start += beats;
        }
        for (const n of bass) {
          expect(n.midi).toBeGreaterThanOrEqual(BASS_RANGE[0]);
          expect(n.midi).toBeLessThanOrEqual(BASS_RANGE[1]);
        }
      });
    }
  });

  it("leads the bass into the next root by a half step", () => {
    for (const bars of song) {
      // the note before each chord change is a half step from the new root
      bars.forEach((notes, bar) => {
        let start = 0;
        for (const [name, beats] of FORM[bar % FORM.length]) {
          const before = notes.find(
            (n) => n.voice === "bass" && n.at === start + beats - 1,
          )!;
          const next = FORM[bar % FORM.length].find(
            (_, i, chords) => chords[i - 1]?.[0] === name,
          );
          const target = next
            ? CHORDS[next[0]].root
            : CHORDS[FORM[(bar + 1) % FORM.length][0][0]].root;
          expect([1, 11]).toContain((before.midi - target + 12) % 12);
          start += beats;
        }
      });
    }
  });

  it("plays only chord tones on the piano and the vibraphone", () => {
    for (const bars of song) {
      bars.forEach((notes, bar) => {
        for (const n of notes) {
          if (n.voice !== "keys" && n.voice !== "vibe") continue;
          expect(chordTones(chordAt(bar, n.at)).has(n.midi % 12)).toBe(true);
        }
      });
    }
  });

  it("keeps the vibraphone below the sounds of the game, with small steps", () => {
    for (const bars of song) {
      const vibe = bars.flat().filter((n) => n.voice === "vibe");
      expect(vibe.length).toBeGreaterThan(0);
      for (const n of vibe) {
        expect(n.midi).toBeGreaterThanOrEqual(VIBE_RANGE[0]);
        expect(n.midi).toBeLessThanOrEqual(VIBE_RANGE[1]);
      }
      for (let i = 1; i < vibe.length; i++) {
        expect(Math.abs(vibe[i].midi - vibe[i - 1].midi)).toBeLessThanOrEqual(
          7,
        );
      }
    }
  });

  it("rests the vibraphone in the last bar of each four", () => {
    for (const bars of song) {
      bars.forEach((notes, bar) => {
        if (bar % 4 === 3) {
          expect(notes.some((n) => n.voice === "vibe")).toBe(false);
        }
      });
    }
  });
});
