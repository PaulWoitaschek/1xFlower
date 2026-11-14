import { freshGarden, uid, type Garden } from "./garden";

export interface Profile {
  id: string;
  name: string;
  flower: number;
}

export interface Store {
  v: 2;
  sound: boolean;
  haptic: boolean;
  active: string | null;
  profiles: Profile[];
  data: Record<string, Garden>;
}

const KEY = "einmaleins-garten-v2";
const OLD_KEY = "einmaleins-garten-v1";

// Gardens saved before the gifts and the visitors existed have no such fields.
// Plants saved before the rest days existed may grow on the next answer.
export function upgrade(garden: Garden): Garden {
  garden.deco = garden.deco || [];
  garden.critters = garden.critters || [];
  for (const fact of Object.values(garden.facts)) fact.grown ??= 0;
  return garden;
}

export function loadStore(storage: Pick<Storage, "getItem">): Store {
  try {
    const saved = JSON.parse(storage.getItem(KEY) || "null");
    if (saved && Array.isArray(saved.profiles) && saved.data) return saved;
  } catch {}
  const store: Store = {
    v: 2,
    sound: true,
    haptic: true,
    active: null,
    profiles: [],
    data: {},
  };
  // carry over progress from the version without profiles
  try {
    const old = JSON.parse(storage.getItem(OLD_KEY) || "null");
    if (old && old.facts && Object.keys(old.facts).length) {
      const id = uid();
      store.profiles.push({ id, name: "Spieler 1", flower: 1 });
      store.data[id] = {
        ...freshGarden(),
        facts: old.facts,
        points: old.points || 0,
        best: old.best || 0,
        rows: old.rows || freshGarden().rows,
      };
      store.active = id;
      if (old.sound === false) store.sound = false;
      if (old.haptic === false) store.haptic = false;
    }
  } catch {}
  return store;
}

export function saveStore(storage: Pick<Storage, "setItem">, store: Store) {
  try {
    storage.setItem(KEY, JSON.stringify(store));
  } catch {}
}

export function activeGarden(store: Store): Garden {
  return upgrade((store.active && store.data[store.active]) || freshGarden());
}
