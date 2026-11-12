import { newRound, type Play } from "../rules/answer";
import type { Garden } from "../rules/garden";
import {
  activeGarden,
  loadStore,
  saveStore,
  type Profile,
} from "../rules/storage";

// The browser can block the storage. Then each access throws, and the rules catch that.
const disk = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
};

export const store = loadStore(disk);
export let garden = activeGarden(store);

export function setGarden(next: Garden) {
  garden = next;
}

export function save() {
  saveStore(disk, store);
}

export function activeProfile(): Profile | null {
  return store.profiles.find((p) => p.id === store.active) || null;
}

export interface Moment {
  type: "good" | "bloom" | "bad";
  text: string;
}

interface Session extends Play {
  cur: string;
  input: string;
  phase: "ask" | "fix" | "ok";
  t0: number;
  bloom: string | null;
  /** the blooms next to the new bloom, they greet it */
  friends: string[];
  moment: Moment | null;
  newTree: number | null;
  newDeco: string | null;
  grew: boolean;
  heroKey: string | null;
}

export const sess: Session = {
  streak: 0,
  qn: 0,
  comeback: [],
  last: null,
  round: newRound(),
  cur: "",
  input: "",
  phase: "ask",
  t0: 0,
  bloom: null,
  friends: [],
  moment: null,
  newTree: null,
  newDeco: null,
  grew: false,
  heroKey: null,
};
