import { describe, expect, it } from "vitest";
import { gardenWith } from "./fixtures";
import { freshGarden } from "./garden";
import { newVisitor } from "./visitors";

const first = () => 0;

describe("newVisitor", () => {
  it("brings butterflies, bees and ladybugs in turn", () => {
    const garden = freshGarden();
    for (let i = 0; i < 5; i++) newVisitor(garden);
    expect(garden.critters.map((c) => c.kind)).toEqual([
      "bfly",
      "bee",
      "bfly",
      "bug",
      "bfly",
    ]);
  });

  it("sits on a bloom, then on a bud, then on a free plant", () => {
    const garden = gardenWith({ "3x3": 4, "4x4": 3 });
    expect(newVisitor(garden, first)?.key).toBe("3x3");
    expect(newVisitor(garden, first)?.key).toBe("4x4");
    expect(newVisitor(garden, first)?.key).toBe("1x1");
  });

  it("gives each visitor a plant of its own", () => {
    const garden = freshGarden();
    for (let i = 0; i < 100; i++) expect(newVisitor(garden)).not.toBeNull();
    expect(new Set(garden.critters.map((c) => c.key)).size).toBe(100);
    expect(newVisitor(garden)).toBeNull();
  });
});
