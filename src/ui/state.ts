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
  /** "again": the second try of a word in the pond, after the tip */
  phase: "ask" | "again" | "fix" | "ok";
  t0: number;
  bloom: string | null;
  /** the blooms next to the new bloom, they greet it */
  friends: string[];
  moment: Moment | null;
  newTree: number | null;
  newDeco: string | null;
  grew: boolean;
  heroKey: string | null;
  /** the patch that became hay with the last answer */
  bale: string | null;
  /** the row that became a haystack with the last answer */
  newStack: number | null;
  /** the chick that hatched last */
  hatched: string | null;
  /** a bloom that a chicken eats, asked as the next task */
  feed: Feeding | null;
  /** the feeding that the current task asks */
  feeding: Feeding | null;
  /** hay bales and chicks of this round on the farm */
  bales: number;
  chicks: number;
  /** the next letter in the pond is a capital letter */
  shift: boolean;
  /** the pond shows a word to remember for a moment, the keys wait */
  flash: boolean;
  /** the animal that came to the pond with the last word */
  newResident: string | null;
}

export interface Feeding {
  chicken: string;
  flower: string;
}

export const sess: Session = {
  streak: 0,
  qn: 0,
  comeback: [],
  water: [],
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
  bale: null,
  newStack: null,
  hatched: null,
  feed: null,
  feeding: null,
  bales: 0,
  chicks: 0,
  shift: false,
  flash: false,
  newResident: null,
};
