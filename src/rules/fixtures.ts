import { freshGarden, type Garden } from "./garden";

// A garden in which each given task has the given level.
export function gardenWith(levels: Record<string, number>): Garden {
  const garden = freshGarden();
  for (const [key, lvl] of Object.entries(levels)) {
    garden.facts[key] = { lvl, seen: 1, right: lvl, wrong: 0, wilt: false };
  }
  return garden;
}

export function row(a: number, lvl: number): Record<string, number> {
  const levels: Record<string, number> = {};
  for (let b = 1; b <= 10; b++) levels[a + "x" + b] = lvl;
  return levels;
}
