import { describe, expect, it } from "vitest";
import { gardenWith } from "./fixtures";
import { freshGarden, type Fact, type Garden } from "./garden";
import {
  activeGarden,
  exportStore,
  importStore,
  loadStore,
  saveStore,
  type Store,
} from "./storage";

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
    expect(store.music).toBe(true);
  });

  it("plays music for stores saved before the music, if their sounds are on", () => {
    const { music: _, ...withSound } = loadStore(disk());
    const read = (saved: object) =>
      loadStore(disk({ [V2]: JSON.stringify(saved) })).music;
    expect(read(withSound)).toBe(true);
    expect(read({ ...withSound, sound: false })).toBe(false);
    expect(read({ ...withSound, sound: false, music: true })).toBe(true);
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
    expect(store.music).toBe(false);
    expect(store.haptic).toBe(true);
    const facts = structuredClone(old.facts);
    Object.assign(facts["7x8"], { watered: 20_000, gap: 0 });
    expect(activeGarden(store, 20_000)).toEqual({
      ...freshGarden(),
      facts,
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

describe("blooms from before the thirst existed", () => {
  it("start the thirst on the day of the upgrade", () => {
    const store = loadStore(disk());
    store.data.a = gardenWith({ "7x8": 4, "2x2": 3 });
    store.active = "a";
    const garden = activeGarden(store, 20_000);
    expect(garden.facts["7x8"]).toMatchObject({ watered: 20_000, gap: 0 });
    expect(garden.facts["2x2"].watered).toBeUndefined();
    garden.facts["7x8"].gap = 2;
    expect(activeGarden(store, 20_005).facts["7x8"]).toMatchObject({
      watered: 20_000,
      gap: 2,
    });
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

  it("lets plants from before the rest days grow on the next answer", () => {
    const store = loadStore(disk());
    const old = gardenWith({ "7x8": 3 });
    delete (old.facts["7x8"] as Partial<Fact>).grown;
    store.data.a = old;
    store.active = "a";
    expect(activeGarden(store).facts["7x8"].grown).toBe(0);
  });
});

describe("exportStore and importStore", () => {
  function storeWith(...names: string[]): Store {
    const store = loadStore(disk());
    names.forEach((name, i) => {
      const id = name.toLowerCase();
      store.profiles.push({ id, name, flower: i + 1 });
      store.data[id] = gardenWith({ "7x8": i + 1 });
    });
    return store;
  }

  it("carries the profiles to another device", () => {
    const from = storeWith("Lena", "Tom");
    const to = loadStore(disk());
    expect(importStore(to, exportStore(from))).toEqual(["lena", "tom"]);
    expect(to.profiles).toEqual(from.profiles);
    expect(to.data.lena.facts["7x8"].lvl).toBe(1);
    expect(to.data.tom.facts["7x8"].lvl).toBe(2);
  });

  it("does not carry the settings of the device", () => {
    const from = { ...storeWith("Lena"), sound: false, active: "lena" };
    const to = loadStore(disk());
    importStore(to, exportStore(from));
    expect(to.sound).toBe(true);
    expect(to.active).toBeNull();
  });

  it("replaces a profile with the same id and keeps the others", () => {
    const from = storeWith("Lena");
    from.data.lena = gardenWith({ "7x8": 5 });
    from.profiles[0].name = "Lena B.";
    const to = storeWith("Lena", "Tom");
    importStore(to, exportStore(from));
    expect(to.profiles.map((p) => p.name)).toEqual(["Lena B.", "Tom"]);
    expect(to.data.lena.facts["7x8"].lvl).toBe(5);
    expect(to.data.tom.facts["7x8"].lvl).toBe(2);
  });

  it("refuses a text that is no backup", () => {
    const to = storeWith("Tom");
    const before = structuredClone(to);
    for (const text of [
      "{broken",
      "null",
      '{"profiles":[],"data":{}}',
      JSON.stringify(to),
      exportStore(loadStore(disk())),
    ])
      expect(importStore(to, text)).toBeNull();
    expect(to).toEqual(before);
  });

  it("skips a profile without a garden", () => {
    const from = storeWith("Lena", "Tom");
    delete from.data.tom;
    const to = loadStore(disk());
    expect(importStore(to, exportStore(from))).toEqual(["lena"]);
    expect(to.profiles.map((p) => p.id)).toEqual(["lena"]);
  });
});
