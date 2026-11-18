import type { PondRight, Resident, TipRight } from "../rules/pond";
import { $, mk } from "./dom";
import { sfx } from "./sound";
import { save, sess } from "./state";

// What the pond and the orchard share: the keyboard, the typed line, the chips,
// the words from school, the animals and the hero.

export const esc = (text: string) =>
  text.replace(/[&<>"]/g, (ch) => "&#" + ch.charCodeAt(0) + ";");

// The letters of a text, the marked ones stand out.
export function letters(
  text: string,
  marked: (index: number) => boolean,
): string {
  return [...text]
    .map((ch, i) => (marked(i) ? "<b>" + esc(ch) + "</b>" : esc(ch)))
    .join("");
}

/* the keyboard */

export interface Layout {
  id: string;
  /** the rows of letters; the third row has the shift and the delete key */
  rows: string[];
  /** the last row: a label and the key, as "OK" with "ok" */
  last: { label: string; key: string; cls: string; aria?: string }[];
  /** the keys that are no letters, they do not change with shift */
  signs: string;
}

let layout: Layout | null = null;
let pressKey: (key: string) => void = () => {};
let shiftShown = false;
let listening = false;

// Builds the keyboard in the page, if it is not this one yet.
export function useKeys(next: Layout, press: (key: string) => void) {
  pressKey = press;
  const keys = $("keys");
  if (!listening) {
    listening = true;
    keys.addEventListener("click", (e) => {
      const key = (e.target as Element).closest("button");
      if (key) pressKey(key.dataset.k!);
    });
  }
  if (layout === next) return;
  layout = next;
  shiftShown = false;
  keys.innerHTML = "";
  next.rows.forEach((row, r) => {
    const line = mk("div", "krow");
    if (r === 2) {
      const shift = mk("button", "wide shift", "⇧");
      shift.dataset.k = "shift";
      shift.setAttribute("aria-label", "Großbuchstabe");
      shift.setAttribute("aria-pressed", "false");
      line.appendChild(shift);
    }
    for (const letter of row) {
      const key = mk("button", "letter", letter);
      key.dataset.k = letter;
      line.appendChild(key);
    }
    if (r === 2) {
      const del = mk("button", "wide del", "⌫");
      del.dataset.k = "del";
      del.setAttribute("aria-label", "Löschen");
      line.appendChild(del);
    }
    keys.appendChild(line);
  });
  const last = mk("div", "krow");
  for (const { label, key, cls, aria } of next.last) {
    const el = mk("button", cls, label);
    el.dataset.k = key;
    if (aria) el.setAttribute("aria-label", aria);
    last.appendChild(el);
  }
  keys.appendChild(last);
}

// The letters of the keys are capitals while shift is on.
export function renderKeys() {
  if (!layout || shiftShown === sess.shift) return;
  shiftShown = sess.shift;
  const { signs } = layout;
  const keys = $("keys");
  keys.querySelectorAll<HTMLElement>(".letter").forEach((key) => {
    const k = key.dataset.k!;
    key.textContent = sess.shift && !signs.includes(k) ? k.toUpperCase() : k;
  });
  keys
    .querySelector(".shift")!
    .setAttribute("aria-pressed", String(sess.shift));
}

// The typed line. Its letters get smaller for a long text, which wraps.
export function showTyped(html: string, length: number, cls: string) {
  const el = $("word");
  el.className = "word" + cls;
  el.style.setProperty("--n", String(Math.max(7, length + 1)));
  el.innerHTML = html;
}

/* the chips of the settings */

export function chip(text: string, pressed: boolean, sign?: string) {
  const el = mk("button", "chip");
  if (sign) el.appendChild(mk("b", null, sign));
  el.appendChild(document.createTextNode(text));
  el.setAttribute("aria-pressed", String(pressed));
  return el;
}

// One chip for each value. The last chosen value stays, or the last value can
// go if `canDrop` says so.
export function chips<T extends string | number>(
  box: HTMLElement,
  prefix: string,
  values: T[],
  name: (value: T) => string,
  chosen: () => T[],
  choose: (next: T[]) => void,
  changed: () => void,
  sign?: (value: T) => string,
  canDrop: (now: T[]) => boolean = (now) => now.length > 1,
) {
  box.innerHTML = "";
  for (const value of values) {
    const el = chip(name(value), chosen().includes(value), sign?.(value));
    el.id = prefix + String(value).replaceAll("/", "-");
    el.onclick = () => {
      const now = chosen();
      if (now.includes(value)) {
        if (!canDrop(now)) return;
        choose(now.filter((v) => v !== value));
      } else choose(values.filter((v) => v === value || now.includes(v)));
      el.setAttribute("aria-pressed", String(chosen().includes(value)));
      save();
      changed();
    };
    box.appendChild(el);
  }
}

/* the words from school */

interface OwnIds {
  /** the card, it gets the class "onlyown" */
  card: string;
  words: string;
  note: string;
  save: string;
  only: string;
}

interface Own {
  own: string[];
  onlyOwn: boolean;
}

// The text field with the words from school, the button that saves them and
// the switch that asks only them. `text` is the note after saving; `after`
// runs when the words changed.
export function buildOwn(
  ids: OwnIds,
  owner: () => Own,
  parse: (input: string) => string[],
  text: (n: number) => string,
  changed: () => void,
  after: () => void = () => {},
) {
  const render = () => {
    const o = owner();
    const only = $<HTMLButtonElement>(ids.only);
    only.disabled = !o.own.length;
    only.setAttribute("aria-pressed", String(o.onlyOwn && !!o.own.length));
    $(ids.card).classList.toggle("onlyown", o.onlyOwn && !!o.own.length);
  };
  $(ids.save).onclick = () => {
    const o = owner();
    const input = $<HTMLTextAreaElement>(ids.words);
    o.own = parse(input.value);
    if (!o.own.length) o.onlyOwn = false;
    after();
    input.value = o.own.join("\n");
    $(ids.note).textContent = text(o.own.length);
    render();
    save();
    sfx("tap");
    changed();
  };
  $(ids.only).onclick = () => {
    const o = owner();
    if (!o.own.length) return;
    o.onlyOwn = !o.onlyOwn;
    render();
    save();
    changed();
  };
  // shows the words of the active profile
  return () => {
    $<HTMLTextAreaElement>(ids.words).value = owner().own.join("\n");
    $(ids.note).textContent = "";
    render();
  };
}

/* the animals */

// The animals of a card: the ones that came, and what the others need.
export function renderResidents(
  boxId: string,
  residents: Resident[],
  count: number,
  unit: string,
) {
  $(boxId).innerHTML = residents
    .map((r) => {
      const got = count >= r.at;
      return (
        '<span class="gift' +
        (got ? " got" : "") +
        (r.name === sess.newResident ? " new" : "") +
        '" title="' +
        r.name +
        '"><span class="rpic">' +
        r.pic +
        "</span>" +
        (got ? r.name : r.at + " " + unit) +
        "</span>"
      );
    })
    .join("");
}

/* the hero: the plant of the task with its stage dots */

// Shows the plant of the task. `draw` makes its drawing, `stage` is its class.
export function renderStageHero(
  id: string,
  draw: (key: string) => string,
  stage: string,
  level: number,
) {
  const hero = $("hero");
  const moment = sess.moment;
  hero.className =
    "hero " +
    stage +
    (sess.bloom === sess.cur ? " bloomed" : "") +
    (moment ? " moment m-" + moment.type : "");
  const heroKey = id + "|" + sess.cur;
  if (sess.heroKey !== heroKey) {
    sess.heroKey = heroKey;
    hero.innerHTML =
      '<div class="pot">' +
      draw(sess.cur) +
      '</div><div class="stages" aria-hidden="true"><i></i><i></i><i></i><i class="top"></i></div><span class="tag"></span>';
  }
  hero.querySelectorAll(".stages i").forEach((dot, i) => {
    dot.classList.toggle("on", i < level);
    dot.classList.toggle("pulse", !!moment && sess.grew && i === level - 1);
  });
  if (moment) hero.querySelector(".tag")!.textContent = moment.text;
}

/* the answer to a typed task: the pond and the orchard use the same steps */

/** what differs between the pond and the orchard when a plant grows */
export interface Flavor {
  /** the animal that comes with this plant */
  arrives: () => Resident | null;
  /** the feedback: the animal came, the bloom opened, the bloom stays */
  comes: string;
  bloom: string;
  stays: string;
  /** the words on the plant */
  moments: { bloom: string; on: string };
  /** the plant flies to the small map */
  fly: () => void;
  color: string;
}

/** the steps of a typed task: first try, tip, second try, copy */
export interface TypedFlow<V> {
  first: (typed: string) => PondRight | { right: false; verdict: V };
  retry: (typed: string) => TipRight | { right: false; verdict: V };
  /** the child copied the solution right */
  copied: (typed: string) => boolean;
  /** the tip after a wrong first try, as html */
  tip: (verdict: V, typed: string) => string;
  /** runs the tip, after it is in the page */
  runTip: (verdict: V) => void;
  /** the solution after two wrong tries, as html */
  solution: (verdict: V) => string;
  /** a right answer: the page shows the right text now */
  onRight: () => void;
  /** the solution is shown */
  onSolution: () => void;
  /** the line under the feedback of a right answer, as html */
  extra: () => string;
  /** the next task waits at least this long (ms) */
  wait: number;
}
