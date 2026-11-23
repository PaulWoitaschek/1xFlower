import { dayOf, freshGarden, uid, type Garden } from "./garden";
import { stampBlooms } from "./thirst";

export interface Profile {
  id: string;
  name: string;
  flower: number;
}

/** the garden practices the multiplication, the farm the division, the pond the spelling, the orchard English words */
export type Mode = "garden" | "farm" | "pond" | "orchard";

export interface Store {
  v: 2;
  mode?: Mode;
  sound: boolean;
  music: boolean;
  haptic: boolean;
  active: string | null;
  profiles: Profile[];
  data: Record<string, Garden>;
}

const KEY = "einmaleins-garten-v2";
const OLD_KEY = "einmaleins-garten-v1";

// Gardens saved before the gifts and the visitors existed have no such fields.
// Plants saved before the rest days existed may grow on the next answer.
// Blooms saved before the thirst existed start it today.
export function upgrade(garden: Garden, today = dayOf(Date.now())): Garden {
  garden.deco = garden.deco || [];
  garden.critters = garden.critters || [];
  for (const fact of Object.values(garden.facts)) fact.grown ??= 0;
  stampBlooms(garden, today);
  return garden;
}

export function loadStore(storage: Pick<Storage, "getItem">): Store {
  try {
    const saved = JSON.parse(storage.getItem(KEY) || "null");
    if (saved && Array.isArray(saved.profiles) && saved.data) {
      // Stores saved before the music existed: music only if the sounds are on.
      saved.music ??= saved.sound !== false;
      return saved;
    }
  } catch {}
  const store: Store = {
    v: 2,
    sound: true,
    music: true,
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
      if (old.sound === false) store.sound = store.music = false;
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

export function activeGarden(store: Store, today = dayOf(Date.now())): Garden {
  return upgrade(
    (store.active && store.data[store.active]) || freshGarden(),
    today,
  );
}

/** the file that carries the profiles to another device */
export interface Backup {
  app: "einmaleins-garten";
  v: 2;
  profiles: Profile[];
  data: Record<string, Garden>;
}

export function exportStore(store: Store): string {
  const backup: Backup = {
    app: "einmaleins-garten",
    v: 2,
    profiles: store.profiles,
    data: store.data,
  };
  return JSON.stringify(backup);
}

function isProfile(p: unknown): p is Profile {
  const q = p as Profile;
  return (
    !!q &&
    typeof q.id === "string" &&
    !!q.id &&
    typeof q.name === "string" &&
    typeof q.flower === "number"
  );
}

/**
 * Reads a backup into the store. A profile of the backup replaces the profile with the same id,
 * so a garden can move back and forth between devices, and the other profiles stay.
 * Returns the ids of the profiles that came, or null when the text is no backup.
 */
export function importStore(store: Store, text: string): string[] | null {
  let backup: Backup;
  try {
    backup = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    !backup ||
    backup.app !== "einmaleins-garten" ||
    !Array.isArray(backup.profiles) ||
    !backup.data ||
    typeof backup.data !== "object"
  )
    return null;
  const profiles = backup.profiles.filter(
    (p) =>
      isProfile(p) &&
      !!backup.data[p.id] &&
      typeof backup.data[p.id].facts === "object",
  );
  if (!profiles.length) return null;
  for (const p of profiles) {
    const profile = { id: p.id, name: p.name.slice(0, 20), flower: p.flower };
    const at = store.profiles.findIndex((q) => q.id === p.id);
    if (at < 0) store.profiles.push(profile);
    else store.profiles[at] = profile;
    store.data[p.id] = upgrade(backup.data[p.id]);
  }
  return profiles.map((p) => p.id);
}
