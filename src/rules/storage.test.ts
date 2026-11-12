import { describe, expect, it } from "vitest";
import { gardenWith } from "./fixtures";
import { freshGarden, type Garden } from "./garden";
import { activeGarden, loadStore, saveStore, type Store } from "./storage";

const V2 = "einmaleins-garten-v2";
const V1 = "einmaleins-garten-v1";

function disk(items: Record<string, string> = {}) {
  return {
    items,
    getItem: (key: string) => items[key] ?? null,
    setItem: (key: string, value: string) => {
      items[key] = value;
    },
  };
}

const blocked = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("loadStore", () => {
  it("starts without profiles", () => {
    const store = loadStore(disk());
    expect(store.profiles).toEqual([]);
    expect(store.active).toBeNull();
    expect(store.sound).toBe(true);
  });

  it("reads back what saveStore wrote", () => {
    const storage = disk();
    const store = loadStore(storage);
    store.profiles.push({ id: "a", name: "Lena", flower: 3 });
    store.data.a = gardenWith({ "7x8": 2 });
    store.active = "a";
    store.sound = false;
    saveStore(storage, store);
    expect(loadStore(storage)).toEqual(store);
  });

  it("starts new when the saved data is broken", () => {
    expect(loadStore(disk({ [V2]: "{broken" })).profiles).toEqual([]);
    expect(loadStore(disk({ [V2]: '{"v":2}' })).profiles).toEqual([]);
  });

  it("starts new when the browser blocks the storage", () => {
    expect(loadStore(blocked).profiles).toEqual([]);
  });

  it("moves the garden of the version without profiles into a profile", () => {
    const old = {
      facts: gardenWith({ "7x8": 4, "2x2": 1 }).facts,
      points: 250,
      best: 9,
      rows: [2, 7],
      sound: false,
    };
    const store = loadStore(disk({ [V1]: JSON.stringify(old) }));
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0].name).toBe("Spieler 1");
    expect(store.active).toBe(store.profiles[0].id);
    expect(store.sound).toBe(false);
    expect(store.haptic).toBe(true);
    expect(activeGarden(store)).toEqual({
      ...freshGarden(),
      facts: old.facts,
      points: 250,
      best: 9,
      rows: [2, 7],
    });
  });

  it("does not make a profile from an old garden without progress", () => {
    const store = loadStore(disk({ [V1]: '{"facts":{},"points":0}' }));
    expect(store.profiles).toEqual([]);
  });

  it("prefers the profiles to the old garden", () => {
    const saved: Store = { ...loadStore(disk()), sound: false };
    const store = loadStore(
      disk({
        [V2]: JSON.stringify(saved),
        [V1]: JSON.stringify({ facts: gardenWith({ "7x8": 4 }).facts }),
      }),
    );
    expect(store).toEqual(saved);
  });
});

describe("saveStore", () => {
  it("does not fail when the browser blocks the storage", () => {
    expect(() => saveStore(blocked, loadStore(disk()))).not.toThrow();
  });
});

describe("activeGarden", () => {
  it("is a new garden when no profile is active", () => {
    expect(activeGarden(loadStore(disk()))).toEqual(freshGarden());
  });

  it("gives a garden from before the gifts and the visitors both lists", () => {
    const store = loadStore(disk());
    const { deco, critters, ...old } = gardenWith({ "7x8": 4 });
    store.data.a = old as Garden;
    store.active = "a";
    const garden = activeGarden(store);
    expect(garden.deco).toEqual(deco);
    expect(garden.critters).toEqual(critters);
    expect(garden.facts["7x8"].lvl).toBe(4);
  });
});
