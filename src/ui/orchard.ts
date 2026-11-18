import { fruitColor, FRUIT_COLORS, treeSVG } from "../art/orchard";
import { dayOf, canGrow } from "../rules/garden";
import {
  addNewLists,
  check,
  chooseWord,
  nextOrchardResident,
  optionsOf,
  orchardArrives,
  orchardOf,
  orchardWords,
  ORCHARD_RESIDENTS,
  retryWrite,
  rightStart,
  ripeTrees,
  taskOf,
  treeStage,
  tryWrite,
  wordOf,
  type Orchard,
  type Task,
  type TreeRight,
  type Verdict,
} from "../rules/orchard";
import { thirsty } from "../rules/thirst";
import {
  groupOf,
  LISTS,
  GROUP_IDS,
  OWN_TEXT_MAX,
  parseOwn,
  tidy,
  type VocabWord,
} from "../rules/vocab";
import {
  buildOwn,
  chips,
  esc,
  renderKeys,
  renderResidents,
  renderStageHero,
  showTyped,
  useKeys,
  type Flavor,
  type Layout,
  type TypedFlow,
} from "./common";
import { $, mk } from "./dom";
import { flyDot } from "./garden";
import { haptic } from "./haptics";
import { sfx } from "./sound";
import { hasEnglishVoice, say } from "./speech";
import { garden, save, sess, store } from "./state";
import { solutionLine, tipName } from "./pond";

export const APPLE = "#E5484D";
/** the most letters of a typed text */
export const TEXT_MAX = OWN_TEXT_MAX;

const KEYS: Layout = {
  id: "orchard",
  rows: ["qwertzuiop", "asdfghjkl", "yxcvbnm"],
  last: [
    { label: "'", key: "'", cls: "sign", aria: "Apostroph" },
    { label: "Leertaste", key: "space", cls: "space" },
    { label: "-", key: "-", cls: "sign", aria: "Bindestrich" },
    { label: "OK", key: "ok", cls: "go" },
  ],
  signs: "",
};

interface Hooks {
  /** a key of the keyboard */
  press: (key: string) => void;
  /** the words of the orchard changed */
  changed: () => void;
  render: () => void;
  setFb: (cls: string, html: string) => void;
  replay: (el: HTMLElement, animation: string) => void;
  /** the first answer of a task counts in the diary */
  noteAnswer: (right: boolean) => void;
  /** a right choice: points, the tree grows, the party, and the next task */
  rightWord: (result: TreeRight, extra: string, wait: number) => void;
  /** the next task comes after some milliseconds */
  next: (ms: number) => void;
}

let hooks: Hooks;
let showOwn: () => void = () => {};

// The task on the screen. The options are made once for each task.
let word: VocabWord | null = null;
let task: Task = "meaning";
let options: string[] = [];
let chosen: string | null = null;
let builtFor = "";
let shown = "";
const dots: Record<string, HTMLElement> = {};

const orchardMode = () => store.mode === "orchard";
const today = () => dayOf(Date.now());
const sub = (text: string) => '<span class="sub">' + text + "</span>";

let words: VocabWord[] = [];
let wordsKey = "";

// The words of the orchard, read again only when the choice changed.
function pool(orchard: Orchard): VocabWord[] {
  const key = JSON.stringify([
    store.active,
    orchard.lists,
    orchard.groups,
    orchard.own,
    orchard.onlyOwn,
  ]);
  if (key !== wordsKey) {
    wordsKey = key;
    words = orchardWords(orchard);
  }
  return words;
}

// "apple = Apfel", for the missed words and the pairs.
export function pairText(key: string): string {
  const found = wordOf(orchardOf(garden), key);
  return found ? found.en + " = " + found.de : key;
}

// The English text and its German meaning, one under the other.
const pairHtml = (w: VocabWord) =>
  '<span class="pair"><span lang="en">' +
  esc(w.en) +
  '</span><span class="eqs">= ' +
  esc(w.de) +
  "</span></span>";

/* the task */

// Takes the word of the new task and makes its options.
export function newOrchardTask() {
  const orchard = orchardOf(garden);
  word = wordOf(orchard, sess.cur) || null;
  chosen = null;
  if (!word) return;
  task = taskOf(orchard, word.en);
  options = task === "write" ? [] : optionsOf(orchard, word, task);
}

// The words or the kind of task changed: a task that is not asked any more
// is replaced.
export function stillAsked(): boolean {
  const orchard = orchardOf(garden);
  const now = word && wordOf(orchard, word.en);
  return (
    !!word &&
    !!now &&
    now.de === word.de &&
    pool(orchard).some((w) => w.en === word!.en) &&
    taskOf(orchard, word.en) === task
  );
}

// The child types the text, there are no options.
export const orchardWrites = () => task === "write";

// The voice reads the English text. Nothing is read without an English voice.
export function speakWord() {
  if (!word || !hasEnglishVoice()) return;
  say([word.en], 0.8, "en");
  if (task !== "meaning") return;
  const cue = $("cue");
  cue.classList.remove("heard");
  void cue.offsetWidth;
  cue.classList.add("heard");
}

// The child taps the word to hear it again. Only a meaning task shows English.
export function hearAgain() {
  if (task === "meaning") speakWord();
}

// A new meaning task is read at once, the others would give the answer away.
export function speakTask() {
  if (store.sound && task === "meaning") speakWord();
}

// After an answer the child hears the right text once.
const speakRight = () => {
  if (store.sound) speakWord();
};

const TIP_TEXT = {
  gross: "Da fehlt ein Großbuchstabe.",
  klein: "Ein Buchstabe ist zu groß.",
};

// The typed text after a wrong first try: the letters that are right stay
// plain, the others stand out. The solution is not shown.
function tipHtml(verdict: Verdict, typed: string): string {
  const text = tidy(typed);
  if (verdict.tip)
    return (
      tipName("Aa", verdict.tip === "gross" ? "Groß" : "Klein") +
      '<span class="big sol">' +
      esc(text) +
      "</span>" +
      sub(TIP_TEXT[verdict.tip] + " Probier es noch einmal!")
    );
  const good = rightStart(text, verdict.target);
  const rest = text.slice(good);
  return (
    '<span class="big sol">' +
    esc(text.slice(0, good)) +
    (rest ? "<b>" + esc(rest) + "</b>" : '<i class="more">…</i>') +
    "</span>" +
    sub(
      (good
        ? rest
          ? "So weit stimmt es. "
          : "Das stimmt so weit. Da fehlt noch etwas. "
        : "") + "Probier es noch einmal!",
    )
  );
}

// The steps of a written task are the ones of the pond.
export function orchardFlow(): TypedFlow<Verdict> {
  const w = word!;
  return {
    first: (typed) => tryWrite(garden, sess, w, typed, today()),
    retry: (typed) => retryWrite(garden, sess, w, typed),
    copied: (typed) => check(w, typed).right,
    tip: tipHtml,
    runTip: () => {},
    solution: (verdict) =>
      solutionLine(
        verdict.target,
        verdict.wrong,
        "Schreib es ab. Es kommt bald wieder.",
      ),
    onRight: speakRight,
    onSolution: speakRight,
    extra: () => pairHtml(w),
    wait: 2400,
  };
}

// The child chooses an option.
export function pickOption(i: number) {
  if (!word || task === "write" || sess.phase !== "ask") return;
  if (!$("summary").hidden || !$("profiles").hidden || !$("feed").hidden)
    return;
  const text = options[i];
  if (text === undefined) return;
  const w = word;
  chosen = text;
  const result = chooseWord(garden, sess, w, task, text, today());
  hooks.noteAnswer(result.right);
  if (result.right) {
    hooks.rightWord(result, pairHtml(w), 2400);
    speakRight();
    return;
  }
  hooks.setFb(
    "bad",
    '<span class="big">' +
      pairHtml(w) +
      "</span>" +
      sub("Das Wort kommt bald wieder."),
  );
  sess.phase = "ok";
  sess.moment = { type: "bad", text: "Verwelkt" };
  save();
  hooks.render();
  hooks.replay($("task"), "shake");
  sfx("bad");
  haptic("bad");
  speakRight();
  hooks.next(3200);
}

/* the hint under the task */

export function orchardHint(): string {
  const orchard = orchardOf(garden);
  const fact = orchard.facts[sess.cur];
  if (thirsty(fact, today()))
    return sub("Diesen Baum kennst du schon. Weißt du es noch?");
  if (fact?.wilt) return sub("Dieser Baum ist welk. Hilf ihm wieder auf!");
  if (fact && fact.seen && fact.lvl < 4 && !canGrow(fact, today()))
    return sub("Dieser Baum ruht heute. Morgen wächst er weiter.");
  if (!Object.values(orchard.facts).some((f) => f.seen))
    return sub(
      task === "meaning"
        ? hasEnglishVoice()
          ? "Tippe auf 🔊 und hör dir das Wort an. Dann such das deutsche Wort."
          : "Lies das englische Wort. Dann such das deutsche Wort."
        : task === "choose"
          ? "Such das englische Wort, das passt."
          : "Schreib das Wort auf Englisch.",
    );
  const { resident, need } = nextOrchardResident(ripeTrees(orchard));
  if (resident)
    return sub(
      "Noch " +
        need +
        (need === 1 ? " Baum" : " Bäume") +
        " mit Früchten, dann kommt: " +
        resident.pic +
        " " +
        resident.name,
    );
  return sub(
    task === "meaning"
      ? "Was heißt das auf Deutsch?"
      : task === "choose"
        ? "Wie sagt man das auf Englisch?"
        : "Schreib das Wort auf Englisch.",
  );
}

/* the screen */

// The cue: the English word to hear, or the picture and the German meaning.
function renderCue(w: VocabWord) {
  const cue = $("cue");
  const meaning = task === "meaning";
  cue.classList.toggle("en", meaning);
  cue.classList.toggle("still", !meaning);
  cue.classList.toggle("mute", !hasEnglishVoice());
  if (meaning) cue.setAttribute("aria-label", "Wort anhören");
  else cue.removeAttribute("aria-label");
  const text = $("cueText");
  text.textContent = meaning ? w.en : w.de;
  text.lang = meaning ? "en" : "de";
  // a picture beside the English word would give the answer away
  $("cuePic").textContent = meaning ? "" : w.pic || "";
  $("cuePic").hidden = meaning || !w.pic;
}

// The option buttons are built once for each task, then only marked.
function renderOptions() {
  const box = $("opts");
  const built = sess.qn + "|" + sess.cur;
  if (builtFor !== built) {
    builtFor = built;
    box.innerHTML = "";
    box.lang = task === "meaning" ? "de" : "en";
    options.forEach((text, i) => {
      const button = mk("button", "opt", text);
      button.dataset.i = String(i);
      box.appendChild(button);
    });
  }
  const right = word ? (task === "meaning" ? word.de : word.en) : "";
  const done = sess.phase === "ok";
  box.querySelectorAll<HTMLButtonElement>(".opt").forEach((button) => {
    const text = button.textContent;
    button.classList.toggle("right", done && text === right);
    button.classList.toggle("wrong", done && text === chosen && text !== right);
    button.disabled = done;
  });
}

// The picture and the meaning, the options or the typed text, the keys.
export function renderOrchardTask() {
  if (!word) return;
  document.body.dataset.task = task;
  renderCue(word);
  if (task === "write") {
    const text = sess.input;
    showTyped(
      '<span class="typed">' + esc(text) + '</span><i class="caret"></i>',
      Math.min(text.length, 14),
      " long" + (text ? "" : " empty"),
    );
    useKeys(KEYS, hooks.press);
    renderKeys();
  } else renderOptions();
  const fact = orchardOf(garden).facts[sess.cur];
  renderStageHero(
    "orchard",
    treeSVG,
    treeStage(orchardOf(garden), sess.cur),
    fact && fact.seen ? fact.lvl : 0,
  );
}

// The summary of a round.
export function orchardSummary(): string {
  const round = sess.round;
  const orchard = orchardOf(garden);
  const tips = round.marks.filter((m) => m === "tip").length;
  return (
    (round.blooms
      ? round.blooms +
        (round.blooms === 1
          ? " neuer Baum trägt Früchte! "
          : " neue Bäume tragen Früchte! ")
      : "Deine Obstwiese wächst. ") +
    (tips
      ? tips + (tips === 1 ? " Wort" : " Wörter") + " mit Tipp geschafft. "
      : "") +
    ripeTrees(orchard) +
    " von " +
    pool(orchard).length +
    " Bäumen tragen Früchte."
  );
}

/** the most dots on the small map of the orchard */
const MAP_MAX = 110;

// The orchard with a tree for each word that the child has seen, and its animals.
export function renderOrchard() {
  const orchard = orchardOf(garden);
  const all = pool(orchard);
  const cur = orchardMode() ? sess.cur : "";
  const stages = all.map((w) => treeStage(orchard, w.en));
  const ripe = stages.filter((stage) => stage === "l4").length;
  const grows = stages.filter((s) => s !== "u" && s !== "l4").length;
  if (orchardMode()) {
    $("sBloomsLab").textContent = "Bäume";
    $("sBlooms").textContent = String(ripe);
    $("mapCap").textContent = ripe + " von " + all.length + " mit Früchten";
  }
  const everRipe = ripeTrees(orchard);
  const key = JSON.stringify([
    wordsKey,
    stages,
    cur,
    sess.bloom,
    sess.grew,
    sess.newResident,
    everRipe,
  ]);
  if (key === shown) return;
  shown = key;

  $("orchardCount").textContent =
    ripe +
    " von " +
    all.length +
    (ripe === 1 ? " Baum trägt" : " Bäumen tragen") +
    " Früchte" +
    (grows ? " · " + grows + (grows === 1 ? " wächst" : " wachsen") : "");
  const box = $("trees");
  box.innerHTML = "";
  const map = $("omap");
  map.innerHTML = "";
  for (const k in dots) delete dots[k];
  all.forEach((w, i) => {
    const stage = stages[i];
    const here = w.en === cur;
    if (i < MAP_MAX) {
      const dot = mk(
        "i",
        stage + (!here ? "" : sess.grew ? " cur grew" : " cur"),
      );
      dot.style.cssText =
        "--pc:" + FRUIT_COLORS[fruitColor(w.en)][0] + ";--cc:#6fbf4a";
      map.appendChild(dot);
      dots[w.en] = dot;
    }
    if (stage === "u") return;
    const cell = mk(
      "div",
      "lcell " +
        stage +
        (here ? " cur" : "") +
        (w.en === sess.bloom ? " bloomed" : ""),
    );
    cell.innerHTML = treeSVG(w.en);
    // the word that the child answers now stays secret
    cell.appendChild(mk("span", null, here ? "?" : w.en));
    box.appendChild(cell);
  });
  $("orchardEmpty").hidden = box.childElementCount > 0;
  renderResidents("oResidents", ORCHARD_RESIDENTS, everRipe, "Bäume");
}

// On phones, a dot flies from the task's tree to its place on the map.
export function flyToOrchardMap() {
  const dot = dots[sess.cur];
  if (dot) flyDot(dot, APPLE);
}

/** how the orchard says that something grew */
export const orchardFlavor = (): Flavor => ({
  arrives: () => orchardArrives(ripeTrees(orchardOf(garden))),
  comes: " zieht auf die Obstwiese!",
  bloom: "Der Baum trägt Früchte!",
  stays: "Er trägt jetzt länger Früchte!",
  moments: { bloom: "Früchte!", on: "Trägt weiter!" },
  fly: flyToOrchardMap,
  color: APPLE,
});

/* the settings */

// The chips and the words from school of the active profile.
export function buildOrchardSettings() {
  const orchard = () => orchardOf(garden);
  if (addNewLists(orchard())) save();
  const changed = () => hooks.changed();
  const box = $("ogroups");
  box.innerHTML = "";
  for (const list of LISTS) {
    const ids = list.groups.map((group) => group.id);
    const row = mk("div", "chips");
    box.append(mk("p", "listname", list.name), row);
    chips(
      row,
      "ogroup-",
      ids,
      (id) => groupOf(id)!.name,
      () => orchard().groups.filter((id) => ids.includes(id)),
      (next) =>
        (orchard().groups = [
          ...orchard().groups.filter((id) => !ids.includes(id)),
          ...next,
        ]),
      changed,
      undefined,
      // the last group stays, unless there are words from school
      () => orchard().groups.length > 1 || orchard().own.length > 0,
    );
  }
  const write = $("owrite");
  write.setAttribute("aria-pressed", String(orchard().write));
  write.onclick = () => {
    orchard().write = !orchard().write;
    write.setAttribute("aria-pressed", String(orchard().write));
    save();
    changed();
  };
  showOwn();
}

export function buildOrchard(h: Hooks) {
  hooks = h;
  $("opts").addEventListener("click", (e) => {
    const button = (e.target as Element).closest("button");
    if (button) pickOption(+button.dataset.i!);
  });
  showOwn = buildOwn(
    {
      card: "orchard",
      words: "oOwnWords",
      note: "oOwnNote",
      save: "oOwnSave",
      only: "oOwnOnly",
    },
    () => orchardOf(garden),
    parseOwn,
    (n) =>
      n
        ? n + (n === 1 ? " eigenes Wort" : " eigene Wörter") + " genommen."
        : "Keine eigenen Wörter genommen.",
    () => hooks.changed(),
    () => {
      // without groups and without own words, the orchard asks everything
      const orchard = orchardOf(garden);
      if (!orchard.own.length && !orchard.groups.length)
        orchard.groups = [...GROUP_IDS];
      buildOrchardSettings();
    },
  );
  buildOrchardSettings();
}
