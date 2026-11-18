import { frogSVG, LILY_COLORS, lilyColor, lilySVG } from "../art/pond";
import {
  lilyStage,
  openLilies,
  pondOf,
  pondWords,
  RESIDENTS,
  wordOf,
  type Pond,
} from "../rules/pond";
import type { Verdict } from "../rules/spell";
import {
  gap,
  LEVELS,
  parseOwn,
  STRATEGIES,
  STRATEGY_NAMES,
  type Strategy,
  type Word,
} from "../rules/words";
import {
  buildOwn,
  chips,
  esc,
  letters,
  renderKeys,
  renderResidents,
  renderStageHero,
  showTyped,
  useKeys,
  type Layout,
} from "./common";
import { $, mk, reduce } from "./dom";
import { flyDot } from "./garden";
import { sfx } from "./sound";
import { hush, say } from "./speech";
import { garden, sess, store } from "./state";

export const WATER = "#5DB7E8";
/** the time a word to remember shows before the child writes it */
export const FLASH_MS = 2600;
/** the most letters of a typed word */
export const WORD_MAX = 30;

const LEVEL_NAMES: Record<number, string> = {
  1: "Leicht",
  2: "Mittel",
  3: "Schwer",
};
/** the signs of the strategies on the chips and the tips */
const SIGNS: Record<Strategy, string> = {
  schwingen: "∪∪",
  verlaengern: "→",
  ableiten: "a→ä",
  merken: "!",
};

const KEYS: Layout = {
  id: "pond",
  rows: ["qwertzuiopü", "asdfghjklöä", "yxcvbnmß"],
  last: [
    { label: "🔊 Anhören", key: "say", cls: "hear" },
    { label: "OK", key: "ok", cls: "go" },
  ],
  signs: "ß",
};

interface Hooks {
  /** a key of the keyboard */
  press: (key: string) => void;
  /** the words of the pond changed */
  changed: () => void;
  render: () => void;
}

let hooks: Hooks;
let shown = "";
let cueKey = "";
let timers: ReturnType<typeof setTimeout>[] = [];
const dots: Record<string, HTMLElement> = {};

const pondMode = () => store.mode === "pond";

// A word in syllables, each one with its arc below.
const arcs = (parted: string) =>
  parted
    .split("-")
    .map((syllable) => '<span class="syl">' + esc(syllable) + "</span>")
    .join("");

let words: Word[] = [];
let wordsKey = "";

// The words of the pond, read again only when the choice changed.
function pool(pond: Pond): Word[] {
  const key = JSON.stringify([
    store.active,
    pond.levels,
    pond.strategies,
    pond.own,
    pond.onlyOwn,
  ]);
  if (key !== wordsKey) {
    wordsKey = key;
    words = pondWords(pond);
  }
  return words;
}

export function inPond(text: string): boolean {
  return pool(pondOf(garden)).some((word) => word.text === text);
}

let showOwn: () => void = () => {};

// The chips and the words from school of the active profile.
export function buildPondSettings() {
  const pond = () => pondOf(garden);
  chips(
    $("plevels"),
    "plevel",
    LEVELS,
    (level) => LEVEL_NAMES[level],
    () => pond().levels,
    (next) => (pond().levels = next),
    () => hooks.changed(),
  );
  chips(
    $("pstrategies"),
    "pstrategy",
    STRATEGIES,
    (strategy) => STRATEGY_NAMES[strategy],
    () => pond().strategies,
    (next) => (pond().strategies = next),
    () => hooks.changed(),
    (strategy) => SIGNS[strategy],
  );
  showOwn();
}

export function buildPond(h: Hooks) {
  hooks = h;
  $("cue").onclick = () => hooks.press("say");
  showOwn = buildOwn(
    {
      card: "pond",
      words: "ownWords",
      note: "ownNote",
      save: "ownSave",
      only: "ownOnly",
    },
    () => pondOf(garden),
    parseOwn,
    (n) =>
      n
        ? n + (n === 1 ? " Lernwort" : " Lernwörter") + " im Teich."
        : "Keine Lernwörter im Teich.",
    () => hooks.changed(),
  );
  buildPondSettings();
}

// Stops the voice, the frog and the word to remember of the last word.
export function quietPond() {
  cueKey = "";
  for (const timer of timers) clearTimeout(timer);
  timers = [];
  sess.flash = false;
  hush();
}

const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

// The voice reads the word, its sentence, and the word again.
export function speakTask() {
  const word = wordOf(pondOf(garden), sess.cur);
  say(
    word.sentence
      ? [word.text, word.sentence, word.text]
      : [word.text, word.text],
  );
  const cue = $("cue");
  cue.classList.remove("heard");
  void cue.offsetWidth;
  cue.classList.add("heard");
}

const TIP_TEXT = {
  gross: "Dieses Wort schreibt man groß.",
  klein: "Dieses Wort schreibt man klein.",
  schwingen: "Sprich das Wort in Silben. Schreib Silbe für Silbe.",
  verlaengern: "Verlängere das Wort. Was hörst du?",
  ableiten: "Denk an das verwandte Wort.",
  merken: "Ein Merkwort! Schau genau hin, dann schreib es.",
};

export const tipName = (sign: string, name: string) =>
  '<span class="tipname"><b>' + sign + "</b>" + name + "</span>";

// The tip after a wrong first try: the strategy that helps, and its help word.
export function tipHtml(word: Word, verdict: Verdict): string {
  const tip = verdict.tip;
  const text = '<span class="sub">' + TIP_TEXT[tip] + "</span>";
  if (tip === "gross" || tip === "klein")
    return tipName("Aa", tip === "gross" ? "Groß" : "Klein") + text;
  const name = tipName(SIGNS[tip], STRATEGY_NAMES[tip]);
  if (tip === "schwingen") {
    const bows = word.syllables
      .map(
        (syllable, i) =>
          '<i class="bow' +
          (i === verdict.syllable ? " here" : "") +
          '" style="--w:' +
          syllable.length +
          '"></i>',
      )
      .join("");
    return (
      name +
      '<span class="swing" id="swing">' +
      bows +
      '<span class="frog">' +
      frogSVG() +
      "</span></span>" +
      text
    );
  }
  const help = verdict.spot?.help;
  if (tip === "merken")
    return (
      name +
      '<span class="sub">' +
      (help ? esc(help) + " " : "") +
      TIP_TEXT.merken +
      "</span>"
    );
  if (help) return name + '<span class="big">' + arcs(help) + "</span>" + text;
  return (
    name +
    '<span class="sub">' +
    (tip === "verlaengern"
      ? "Verlängere das Wort. Was hörst du am Ende?"
      : "Gibt es ein verwandtes Wort mit a oder au?") +
    "</span>"
  );
}

// The frog hops from syllable to syllable. The child speaks the syllables.
function swing(word: Word) {
  const box = document.getElementById("swing");
  if (!box) return;
  const bows = box.querySelectorAll<HTMLElement>(".bow");
  const frog = box.querySelector<HTMLElement>(".frog")!;
  const hop = (i: number) => {
    const bow = bows[i];
    if (!bow || !frog.isConnected) return;
    frog.style.left = bow.offsetLeft + bow.offsetWidth / 2 + "px";
    frog.classList.add("on");
    if (!reduce) {
      frog.classList.remove("hop");
      void frog.offsetWidth;
      frog.classList.add("hop");
    }
    bow.classList.add("sung");
    sfx("hop");
  };
  word.syllables.forEach((_, i) => later(() => hop(i), i * 750));
}

// Shows and reads the tip. A word to remember shows for a moment.
export function runTip(word: Word, verdict: Verdict) {
  const speak = store.sound;
  const tip = verdict.tip;
  if (tip === "schwingen") return swing(word);
  if (tip === "merken") {
    sess.flash = true;
    later(() => {
      sess.flash = false;
      hooks.render();
    }, FLASH_MS);
    if (speak) say([word.text]);
    return;
  }
  if (tip === "gross" || tip === "klein") return;
  const help = verdict.spot?.help;
  if (speak) say(help ? [help.replaceAll("-", "")] : [word.text]);
}

// The right text after two wrong tries. The wrong letters stand out.
export function solutionLine(text: string, wrong: number[], note: string) {
  return (
    '<span class="big sol">' +
    letters(text, (i) => wrong.includes(i)) +
    '</span><span class="sub">' +
    note +
    "</span>"
  );
}

export const solutionHtml = (word: Word, verdict: Verdict) =>
  solutionLine(
    word.text,
    verdict.wrong,
    "Schreib das Wort ab. Es kommt bald wieder.",
  );

// The picture and the sentence of the word, the typed letters and the keys.
export function renderPondTask() {
  const pond = pondOf(garden);
  const word = wordOf(pond, sess.cur);
  if (cueKey !== sess.cur) {
    cueKey = sess.cur;
    $("cue").className = "cue";
    $("cueText").removeAttribute("lang");
    $("cuePic").textContent = word.pic || "";
    $("cuePic").hidden = !word.pic;
    $("cueText").textContent = gap(word) || "Hör genau hin!";
  }
  const text = sess.flash ? word.text : sess.input;
  showTyped(
    sess.flash
      ? '<span class="typed">' +
          letters(word.text, (i) =>
            word.spots.some((s) => i >= s.at && i < s.at + s.len),
          ) +
          "</span>"
      : '<span class="typed">' + esc(text) + '</span><i class="caret"></i>',
    text.length,
    (sess.flash ? " flash" : "") + (text ? "" : " empty"),
  );
  useKeys(KEYS, hooks.press);
  renderKeys();
  renderPondHero();
}

function renderPondHero() {
  const pond = pondOf(garden);
  const fact = pond.facts[sess.cur];
  renderStageHero(
    "pond",
    lilySVG,
    lilyStage(pond, sess.cur),
    fact && fact.seen ? fact.lvl : 0,
  );
}

/** the most dots on the small map of the pond */
const MAP_MAX = 110;

// The pond with a lily for each word that the child wrote, and its animals.
export function renderPond() {
  const pond = pondOf(garden);
  const all = pool(pond);
  const cur = pondMode() ? sess.cur : "";
  const stages = all.map((word) => lilyStage(pond, word.text));
  const open = stages.filter((stage) => stage === "l4").length;
  const grows = stages.filter((s) => s !== "u" && s !== "l4").length;
  if (pondMode()) {
    $("sBloomsLab").textContent = "Seerosen";
    $("sBlooms").textContent = String(open);
    $("mapCap").textContent = open + " von " + all.length + " blühen";
  }
  const everOpen = openLilies(pond);
  const key = JSON.stringify([
    wordsKey,
    stages,
    cur,
    sess.bloom,
    sess.grew,
    sess.newResident,
    everOpen,
  ]);
  if (key === shown) return;
  shown = key;

  $("pondCount").textContent =
    open +
    " von " +
    all.length +
    " Seerosen blühen" +
    (grows ? " · " + grows + (grows === 1 ? " wächst" : " wachsen") : "");
  const box = $("lilies");
  box.innerHTML = "";
  const map = $("pmap");
  map.innerHTML = "";
  for (const key in dots) delete dots[key];
  all.forEach((word, i) => {
    const stage = stages[i];
    const here = word.text === cur;
    if (i < MAP_MAX) {
      const dot = mk(
        "i",
        stage + (!here ? "" : sess.grew ? " cur grew" : " cur"),
      );
      const [petal] = LILY_COLORS[lilyColor(word.text)];
      dot.style.cssText = "--pc:" + petal + ";--cc:#F4B323";
      map.appendChild(dot);
      dots[word.text] = dot;
    }
    if (stage === "u") return;
    const cell = mk(
      "div",
      "lcell " +
        stage +
        (here ? " cur" : "") +
        (word.text === sess.bloom ? " bloomed" : ""),
    );
    cell.innerHTML = lilySVG(word.text);
    // the word that the child writes now stays secret
    cell.appendChild(mk("span", null, here ? "?" : word.text));
    box.appendChild(cell);
  });
  $("pondEmpty").hidden = box.childElementCount > 0;
  renderResidents("residents", RESIDENTS, everOpen, "Seerosen");
}

// On phones, a dot flies from the task's lily to its place on the map.
export function flyToPondMap() {
  const dot = dots[sess.cur];
  if (dot) flyDot(dot, WATER);
}
