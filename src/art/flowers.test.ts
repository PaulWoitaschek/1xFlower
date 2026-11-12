import { describe, expect, it } from "vitest";
import { allKeys } from "../rules/garden";
import {
  avatarVariety,
  COLORS,
  flowerSVG,
  KINDS,
  varietyOf,
  type Variety,
} from "./flowers";

const name = (v: Variety) => v.kind + "/" + v.color;

describe("varietyOf", () => {
  it("gives each of the 100 plants a flower of its own", () => {
    expect(new Set(allKeys().map((key) => name(varietyOf(key)))).size).toBe(
      100,
    );
  });

  it("gives a plant the same flower each time", () => {
    expect(varietyOf("7x8")).toEqual(varietyOf("7x8"));
  });

  it("uses each kind of flower and each color", () => {
    const all = allKeys().map(varietyOf);
    expect(new Set(all.map((v) => v.kind)).size).toBe(KINDS.length);
    expect(new Set(all.map((v) => v.color)).size).toBe(COLORS.length);
  });
});

describe("avatarVariety", () => {
  it("has ten different flowers for the profiles", () => {
    const all = Array.from({ length: 10 }, (_, i) => avatarVariety(i + 1));
    expect(new Set(all.map((v) => v.kind)).size).toBe(10);
    expect(new Set(all.map((v) => v.color)).size).toBe(10);
  });

  it("falls back to a flower for a number out of range", () => {
    expect(avatarVariety(0)).toEqual(avatarVariety(10));
    expect(avatarVariety(11)).toEqual(avatarVariety(1));
  });
});

describe("flowerSVG", () => {
  it("draws a seed, a bud and petals for each kind of flower", () => {
    KINDS.forEach((_, kind) => {
      const svg = flowerSVG({ kind, color: 0, leaf: kind % 3 });
      expect(svg).toContain('class="seed"');
      expect(svg).toContain('class="bud"');
      expect(svg).toMatch(/class="petals"[^>]*><(path|circle|ellipse)/);
    });
  });
});
