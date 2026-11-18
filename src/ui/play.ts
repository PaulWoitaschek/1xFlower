import { CRITTER_NAMES } from "../art/critters";
import { sized } from "../art/deco";
import { chickenSVG, grassSVG } from "../art/farm";
import { flowerSVG, varietyOf } from "../art/flowers";
import { answer, multiplier, newRound, ROUND } from "../rules/answer";
import {
  bloomCount,
  bloomingNeighbours,
  dayOf,
  factors,
  freshGarden,
  stage,
  tomorrow,
} from "../rules/garden";
import {
  answerFarm,
  divParts,
  EGG_WARMTH,
  farmOf,
  feedFlower,
  flowerTask,
  hayPatches,
  patchStage,
  pickFarm,
  quotientOf,
} from "../rules/farm";
import {
  arrives,
  nextResident,
  openLilies,
  POND_ROUND,
  pickPond,
  pondOf,
  pondWords,
  retryWord,
  tryWord,
  wordOf,
} from "../rules/pond";
import { claimGifts, nextGift } from "../rules/gifts";
import { nothingGrows, pickNext } from "../rules/pick";
import { upgrade, type Mode } from "../rules/storage";
import { thirsty, thirstyKeys, WATER_MIN, waterQueue } from "../rules/thirst";
import { $, mk, reduce } from "./dom";
import {
  buildGarden,
  flyCritter,
  flyToMap,
  renderGarden,
  showGarden,
} from "./garden";
import {
  buildFarm,
  closeFeed,
  flyToFarmMap,
  GRASS,
  HAY,
  mealText,
  renderFarm,
} from "./farm";
import {
  buildPond,
  flyToPondMap,
  inPond,
  quietPond,
  renderPond,
  renderPondTask,
  runTip,
  solutionHtml,
  speakTask,
  tipHtml,
  WATER,
  WORD_MAX,
  buildPondSettings,
} from "./pond";
import { haptic } from "./haptics";
import { greetBloom } from "./life";
import { confetti, heartsFromFlower, rainOnFlower, sparkle } from "./particles";
import {
  beeVisit,
  butterflyBurst,
  endRainbow,
  passerBy,
  rainbow,
} from "./party";
import {
  closeProfiles,
  initProfiles,
  openProfiles,
  updateWho,
} from "./profiles";
import { initFullscreen } from "./fullscreen";
import { initMusic, syncMusic } from "./music";
import { sfx } from "./sound";
import { initSpeech, say } from "./speech";
import { activeProfile, garden, save, sess, setGarden, store } from "./state";

const PRAISE = ["Super!", "Klasse!", "Genau!", "Stark!", "Richtig!", "Spitze!"];

const today = () => dayOf(Date.now());

function setFb(cls: string, html: string) {
  const fb = $("fb");
  fb.className = "feedback " + cls;
  fb.innerHTML = html;
}

function replay(el: HTMLElement, animation: string) {
  el.classList.remove(animation);
  void el.offsetWidth;
  el.classList.add(animation);
}

// What the plants that rest today can bring tomorrow.
function tomorrowText() {
  const { buds, blooms } = tomorrow(garden, today());
  const parts = [];
  if (blooms) parts.push(blooms + (blooms === 1 ? " Blüte" : " Blüten"));
  if (buds) parts.push(buds + (buds === 1 ? " Knospe" : " Knospen"));
  if (!parts.length) return "";
  return (
    (buds + blooms === 1 ? "Morgen kann " : "Morgen können ") +
    parts.join(" und ") +
    " kommen!"
  );
}

const MORE_ROWS = "Nimm im Garten eine Reihe dazu!";

const farmMode = () => store.mode === "farm";
const pondMode = () => store.mode === "pond";

const sub = (text: string) => '<span class="sub">' + text + "</span>";

function eaterOf(feeding: { chicken: string } | null) {
  if (!feeding) return null;
  return farmOf(garden).chickens.find((c) => c.id === feeding.chicken) || null;
}

function farmHint() {
  const farm = farmOf(garden);
  const eater = eaterOf(sess.feeding);
  if (eater)
    return sub(
      "Weißt du es? Dann frisst dein " +
        (eater.grown ? "Huhn" : "Küken") +
        " die Blume.",
    );
  const egg = farm.eggs[0];
  if (egg) {
    const left = EGG_WARMTH - egg.warmth;
    return sub(
      "Noch " +
        left +
        (left === 1 ? " richtige Antwort" : " richtige Antworten") +
        ", dann schlüpft ein Küken!",
    );
  }
  if (farm.hay && farm.chickens.some((c) => !c.grown))
    return sub("Dein Küken hat Hunger. Füttere es im Hof!");
  return "";
}

function pondHint() {
  const pond = pondOf(garden);
  const fact = pond.facts[sess.cur];
  if (thirsty(fact, today()))
    return sub("Dieses Wort kennst du schon. Weißt du es noch?");
  if (!Object.values(pond.facts).some((f) => f.seen))
    return sub("Tippe auf 🔊 und hör dir das Wort an. Dann schreib es.");
  const { resident, need } = nextResident(openLilies(pond));
  if (resident)
    return sub(
      "Noch " +
        need +
        (need === 1 ? " Seerose" : " Seerosen") +
        ", dann kommt: " +
        resident.pic +
        " " +
        resident.name,
    );
  return sub("Hör genau hin und schreib das Wort.");
}

function hint() {
  if (pondMode()) return pondHint();
  if (farmMode()) return farmHint();
  if (thirsty(garden.facts[sess.cur], today())) {
    return '<span class="sub">Diese Blume hat Durst. Weißt du es noch?</span>';
  }
  if (nothingGrows(garden, today())) {
    const next = tomorrowText();
    if (garden.rows.length < 10)
      return (
        '<span class="sub">In deinen Reihen wächst heute nichts mehr. ' +
        MORE_ROWS +
        "</span>"
      );
    if (next) return '<span class="sub">' + next + "</span>";
  }
  const { gift, need } = nextGift(garden);
  if (need <= 0) return "";
  return (
    '<span class="sub">' +
    (gift ? sized(gift, 24) : "") +
    "Noch " +
    need +
    (need === 1 ? " Blüte" : " Blüten") +
    (gift ? " bis zum Geschenk" : ", dann blüht alles") +
    "</span>"
  );
}

// Thirsty blooms come first: three or more get a short round of their own.
function startRound() {
  sess.bales = 0;
  sess.chicks = 0;
  if (pondMode()) {
    sess.water = [];
    sess.round = newRound(POND_ROUND);
    newTask();
    return;
  }
  if (farmMode()) {
    sess.water = [];
    sess.round = newRound();
    newTask();
    return;
  }
  sess.water = waterQueue(garden, today());
  const short = sess.water.length >= WATER_MIN;
  sess.round = newRound(short ? sess.water.length : ROUND, short);
  newTask();
}

function newTask() {
  quietPond();
  if (sess.round.n >= sess.round.size) {
    showSummary();
    return;
  }
  sess.qn++;
  sess.feeding = null;
  if (pondMode()) sess.cur = pickPond(pondOf(garden), sess, today());
  else if (!farmMode()) sess.cur = pickNext(garden, sess, today());
  else if (sess.feed) {
    sess.feeding = sess.feed;
    sess.feed = null;
    sess.cur = flowerTask(sess.feeding.flower);
  } else sess.cur = pickFarm(farmOf(garden), sess);
  sess.input = "";
  sess.shift = false;
  sess.newResident = null;
  sess.phase = "ask";
  sess.t0 = performance.now();
  sess.bloom = null;
  sess.friends = [];
  sess.moment = null;
  sess.newTree = null;
  sess.newDeco = null;
  sess.bale = null;
  sess.newStack = null;
  sess.hatched = null;
  setFb("", hint());
  endRainbow();
  render();
  if (pondMode() && store.sound) speakTask();
}

// A new bloom is a small party: hearts rise, and bees or butterflies come.
function bloomParty(big: boolean) {
  heartsFromFlower(big ? 14 : 8);
  greetBloom(sess.cur, sess.friends);
  if (big) rainbow();
  const bees = big || Math.random() < 0.5;
  if (bees) {
    beeVisit(3);
    setTimeout(() => sfx("buzz"), 500);
  }
  if (big || !bees) {
    butterflyBurst(big ? 4 : 5);
    setTimeout(() => sfx("flutter"), 300);
  }
}

// The answer to the current task.
const solution = (key: string) => {
  if (farmMode()) return quotientOf(key);
  const [a, b] = factors(key);
  return a * b;
};

function submit() {
  if (!sess.input || sess.phase === "ok") return;
  if (pondMode()) return submitPond();
  const value = +sess.input;
  if (sess.phase === "fix") {
    if (value === solution(sess.cur)) {
      sess.phase = "ok";
      sess.moment = { type: "good", text: "Gegossen!" };
      setFb("good", '<span class="big">Jetzt sitzt es!</span>');
      render();
      sfx("water");
      haptic("good");
      rainOnFlower();
      setTimeout(newTask, 1300);
    } else {
      sess.input = "";
      render();
      replay($("task"), "shake");
      sfx("bad");
      haptic("bad");
    }
    return;
  }

  const fast = performance.now() - sess.t0 < 4000;
  if (farmMode()) return submitFarm(value, fast);
  const [a, b] = factors(sess.cur);
  const product = a * b;
  const result = answer(garden, sess, sess.cur, value, fast, today());
  if (!result.right) {
    setFb(
      "bad",
      '<span class="big">' +
        a +
        " × " +
        b +
        " = " +
        product +
        '</span><span class="sub">Tipp die ' +
        product +
        " ein. Das kommt bald wieder.</span>",
    );
    sess.phase = "fix";
    sess.input = "";
    sess.moment = { type: "bad", text: "Verwelkt" };
    save();
    render();
    replay($("task"), "shake");
    sfx("bad");
    haptic("bad");
    return;
  }

  const {
    points,
    before,
    bloom,
    rest,
    rowDone,
    freshAgain,
    quenched,
    gift,
    visitor,
  } = result;
  let sub = "+" + points + " Punkte" + (fast ? " (schnell!)" : "");
  if (rowDone) {
    sub = "Die " + a + "er-Reihe blüht! Ein Baum wächst.";
    sess.newTree = a;
  } else if (gift) sub = sized(gift, 24) + "Geschenk: " + gift.name + "!";
  else if (visitor)
    sub = CRITTER_NAMES[visitor.kind] + " zieht ein! (+" + points + ")";
  else if (bloom) sub = "Neue Blüte! " + sub;
  else if (quenched) sub = "Sie bleibt jetzt länger frisch! (+" + points + ")";
  else if (rest)
    sub =
      (before === 3
        ? "Morgen kann sie blühen!"
        : "Morgen kann eine Knospe wachsen!") +
      " (+" +
      points +
      ")";
  if (bloom) {
    sess.bloom = sess.cur;
    sess.friends = bloomingNeighbours(garden, sess.cur);
  }
  if (gift) sess.newDeco = gift.id;
  setFb(
    "good",
    '<span class="big">' +
      PRAISE[Math.floor(Math.random() * PRAISE.length)] +
      '</span><span class="sub">' +
      sub +
      "</span>",
  );
  sess.phase = "ok";
  sess.moment = rowDone
    ? { type: "bloom", text: "Reihe komplett!" }
    : bloom
      ? { type: "bloom", text: "Blüht!" }
      : {
          type: "good",
          text: freshAgain
            ? "Wieder frisch!"
            : rest || quenched
              ? "Gegossen!"
              : before === 4
                ? "Blüht weiter!"
                : "Wächst!",
        };
  sess.grew = !rest;
  save();
  // Before the render, so that the visitor does not show on its plant during the flight.
  if (visitor) flyCritter(visitor);
  render();
  replay($("ans"), "pop");
  flyToMap();
  if (rowDone || gift) {
    sfx("fanfare");
    haptic("bloom");
    sparkle(40);
    confetti();
    setTimeout(confetti, 600);
    bloomParty(true);
  } else if (bloom) {
    sfx("bloom");
    haptic("bloom");
    sparkle(40);
    confetti();
    bloomParty(false);
  } else {
    sfx("good");
    haptic("good");
    sparkle(14);
    if (rest || quenched) {
      rainOnFlower();
      setTimeout(() => sfx("water"), 250);
    }
    if (sess.streak % 5 === 0) {
      sfx("streak");
      if (!visitor) confetti();
    }
    if (!visitor && Math.random() < 0.3) passerBy();
  }
  setTimeout(
    newTask,
    rowDone || gift ? 2800 : bloom ? 2500 : visitor ? 2100 : 1350,
  );
}

// The first answer to a division task on the farm.
function submitFarm(value: number, fast: boolean) {
  const key = sess.cur;
  const [dividend, divisor] = divParts(key);
  const feeding = sess.feeding;
  const result = answerFarm(garden, sess, key, value, fast);
  if (!result.right) {
    const q = quotientOf(key);
    setFb(
      "bad",
      '<span class="big">' +
        dividend +
        " : " +
        divisor +
        " = " +
        q +
        '</span><span class="sub">Tipp die ' +
        q +
        " ein. Das kommt bald wieder." +
        (feeding ? " Die Blume bleibt im Garten." : "") +
        "</span>",
    );
    sess.phase = "fix";
    sess.input = "";
    sess.moment = { type: "bad", text: "Vertrocknet" };
    save();
    render();
    replay($("task"), "shake");
    sfx("bad");
    haptic("bad");
    return;
  }

  const { points, before, bale, newHay, rowDone, freshAgain, hatched } = result;
  const eater = eaterOf(feeding);
  const meal =
    feeding && eater
      ? feedFlower(garden, eater.id, feeding.flower, today())
      : null;
  if (bale) sess.bales++;
  if (hatched) {
    sess.chicks++;
    sess.hatched = hatched.id;
  }
  if (newHay) sess.bale = key;
  if (rowDone) sess.newStack = divisor;
  let text = "+" + points + " Punkte" + (fast ? " (schnell!)" : "");
  if (hatched) text = "Ein Küken ist geschlüpft! Schau mal in den Hof.";
  else if (meal && eater)
    text =
      mealText(eater, meal) +
      (meal.grown || meal.egg ? "" : " Die Blume wächst im Garten neu.");
  else if (rowDone)
    text = "Die " + divisor + "er-Reihe ist ganz Heu! Ein Heuhaufen entsteht.";
  else if (bale) text = "Ein Heuballen für die Scheune! (+" + points + ")";
  setFb(
    "good",
    '<span class="big">' +
      PRAISE[Math.floor(Math.random() * PRAISE.length)] +
      '</span><span class="sub">' +
      text +
      "</span>",
  );
  sess.phase = "ok";
  sess.moment = hatched
    ? { type: "bloom", text: "Piep!" }
    : meal
      ? { type: "bloom", text: "Lecker!" }
      : rowDone
        ? { type: "bloom", text: "Reihe komplett!" }
        : bale
          ? { type: newHay ? "bloom" : "good", text: "Heu!" }
          : { type: "good", text: freshAgain ? "Wieder grün!" : "Wächst!" };
  sess.grew = before < 4;
  save();
  render();
  replay($("ans"), "pop");
  flyToFarmMap();
  const big = hatched || rowDone || meal?.grown || meal?.egg;
  if (big) {
    sfx(hatched ? "peep" : "fanfare");
    if (hatched) setTimeout(() => sfx("fanfare"), 450);
    haptic("bloom");
    sparkle(40, HAY);
    confetti();
    heartsFromFlower(12);
  } else if (meal || newHay) {
    sfx(meal ? "peep" : "bloom");
    haptic("bloom");
    sparkle(30, HAY);
    if (meal) heartsFromFlower(8);
    else confetti();
  } else {
    sfx("good");
    haptic("good");
    sparkle(14, bale ? HAY : GRASS);
    if (sess.streak % 5 === 0) {
      sfx("streak");
      confetti();
    }
  }
  setTimeout(newTask, big ? 2700 : meal || newHay ? 2100 : 1350);
}

// A word of the pond: the first try, the second try after the tip, and the copy.
function submitPond() {
  const pond = pondOf(garden);
  const word = wordOf(pond, sess.cur);
  const typed = sess.input;
  if (sess.flash) return;
  if (sess.phase === "fix") {
    if (typed === word.text) {
      sess.phase = "ok";
      sess.moment = { type: "good", text: "Gegossen!" };
      setFb("good", '<span class="big">Jetzt sitzt es!</span>');
      render();
      sfx("water");
      haptic("good");
      rainOnFlower();
      setTimeout(newTask, 1300);
    } else {
      sess.input = "";
      render();
      replay($("task"), "shake");
      sfx("bad");
      haptic("bad");
    }
    return;
  }

  if (sess.phase === "again") {
    const result = retryWord(garden, sess, word, typed);
    if (result.right) {
      sess.phase = "ok";
      sess.moment = { type: "good", text: "Geschafft!" };
      setFb(
        "good",
        '<span class="big">Mit Tipp geschafft!</span>' +
          sub(
            "+" + result.points + " Punkte. Das Wort kommt gleich noch einmal.",
          ),
      );
      save();
      render();
      replay($("word"), "pop");
      sfx("good");
      haptic("good");
      sparkle(14, WATER);
      setTimeout(newTask, 1700);
    } else {
      setFb("bad", solutionHtml(word, result.verdict));
      sess.phase = "fix";
      sess.input = "";
      sess.moment = { type: "bad", text: "Verwelkt" };
      save();
      render();
      replay($("task"), "shake");
      sfx("bad");
      haptic("bad");
      if (store.sound) say([word.text]);
    }
    return;
  }

  const result = tryWord(garden, sess, word, typed, today());
  if (!result.right) {
    // a tip is help, not a punishment: no shake, no bad sound
    sess.phase = "again";
    sess.input = "";
    setFb("tip", tipHtml(word, result.verdict));
    save();
    render();
    // the tip must be in the page first, runTip moves its parts
    runTip(word, result.verdict);
    if (sess.flash) render();
    sfx("del");
    haptic("tap");
    return;
  }

  const { points, before, bloom, rest, freshAgain, quenched } = result;
  let text = "+" + points + " Punkte";
  let resident = null;
  if (bloom) {
    sess.bloom = sess.cur;
    resident = arrives(openLilies(pond));
    if (resident) sess.newResident = resident.name;
  }
  if (resident)
    text = resident.pic + " " + resident.name + " zieht an den Teich!";
  else if (bloom) text = "Die Seerose blüht! " + text;
  else if (quenched) text = "Sie bleibt jetzt länger offen! (+" + points + ")";
  else if (rest)
    text =
      (before === 3
        ? "Morgen kann sie blühen!"
        : "Morgen kann eine Knospe wachsen!") +
      " (+" +
      points +
      ")";
  setFb(
    "good",
    '<span class="big">' +
      PRAISE[Math.floor(Math.random() * PRAISE.length)] +
      "</span>" +
      sub(text),
  );
  sess.phase = "ok";
  sess.moment = bloom
    ? { type: "bloom", text: "Blüht!" }
    : {
        type: "good",
        text: freshAgain
          ? "Wieder frisch!"
          : rest || quenched
            ? "Gegossen!"
            : before === 4
              ? "Blüht weiter!"
              : "Wächst!",
      };
  sess.grew = !rest;
  save();
  render();
  replay($("word"), "pop");
  flyToPondMap();
  if (resident) {
    sfx("fanfare");
    haptic("bloom");
    sparkle(40, WATER);
    confetti();
    setTimeout(confetti, 600);
    heartsFromFlower(14);
    rainbow();
  } else if (bloom) {
    sfx("bloom");
    haptic("bloom");
    sparkle(40, WATER);
    confetti();
    heartsFromFlower(8);
  } else {
    sfx("good");
    haptic("good");
    sparkle(14, WATER);
    if (rest || quenched) {
      rainOnFlower();
      setTimeout(() => sfx("water"), 250);
    }
    if (sess.streak % 5 === 0) {
      sfx("streak");
      confetti();
    }
  }
  setTimeout(newTask, resident ? 2800 : bloom ? 2500 : 1350);
}

// A key of the letter keyboard of the pond.
function pressPond(k: string) {
  if (
    sess.phase === "ok" ||
    !$("summary").hidden ||
    !$("profiles").hidden ||
    !$("feed").hidden
  )
    return;
  if (k === "say") return speakTask();
  if (sess.flash) return;
  if (k === "ok") return submit();
  if (k === "shift") sess.shift = !sess.shift;
  else if (k === "del") {
    if (!sess.input) return;
    sess.input = sess.input.slice(0, -1);
    sfx("del");
  } else {
    if (sess.input.length >= WORD_MAX) return;
    sess.input += sess.shift && k !== "ß" ? k.toUpperCase() : k;
    sess.shift = false;
    sfx("tap");
  }
  haptic("tap");
  render();
}

// The words of the pond changed: a task that is not in the pond any more is replaced.
function pondChanged() {
  if (
    pondMode() &&
    $("summary").hidden &&
    (sess.phase === "ask" || sess.phase === "again") &&
    !inPond(sess.cur)
  ) {
    sess.qn--;
    newTask();
  } else render();
}

function press(k: string) {
  if (
    sess.phase === "ok" ||
    !$("summary").hidden ||
    !$("profiles").hidden ||
    !$("feed").hidden
  )
    return;
  if (k === "ok") return submit();
  if (k === "del") {
    if (!sess.input) return;
    sess.input = sess.input.slice(0, -1);
    sfx("del");
  } else {
    if (sess.input.length >= 3) return;
    sess.input = (sess.input + k).replace(/^0+(?=\d)/, "");
    sfx("tap");
  }
  haptic("tap");
  render();
}

function renderTask() {
  if (!pondMode()) {
    const [a, b] = farmMode() ? divParts(sess.cur) : factors(sess.cur);
    $("qa").textContent = String(a);
    $("qop").textContent = farmMode() ? ":" : "×";
    $("qb").textContent = String(b);
    const ans = $("ans");
    ans.textContent = sess.input || "?";
    ans.classList.toggle("empty", !sess.input);
  }
  const task = $("task");
  task.classList.toggle("fix", sess.phase === "fix");
  task.classList.toggle("again", sess.phase === "again");
  task.classList.toggle("ok", sess.phase === "ok");
  $("sPoints").textContent = String(garden.points);
  $("sStreak").textContent = String(sess.streak);
  const mult = multiplier(sess.streak);
  $("sMult").hidden = mult === 1;
  $("sMult").textContent = "×" + mult;
  $("bestText").textContent = "Beste Serie: " + garden.best;
  const size = sess.round.size;
  const shown = Math.min(sess.round.n + (sess.phase === "ask" ? 1 : 0), size);
  $("roundText").textContent =
    (pondMode()
      ? "Wort "
      : sess.round.water
        ? "Gießrunde: Blume "
        : "Aufgabe ") +
    Math.max(shown, 1) +
    " von " +
    size;
  const progress = $("progress");
  progress.style.gridTemplateColumns = pondMode()
    ? "repeat(" + size + ", 1fr)"
    : "";
  progress.innerHTML = "";
  for (let i = 0; i < size; i++) {
    // the second try of a word has no mark yet, but the word counts already
    const now =
      (sess.phase === "ask" && i === sess.round.n) ||
      (sess.phase === "again" && i === sess.round.n - 1);
    progress.appendChild(mk("i", sess.round.marks[i] || (now ? "now" : null)));
  }

  if (pondMode()) renderPondTask();
  else if (farmMode()) renderFarmHero();
  else renderHero();

  $("soundBtn").textContent = "Ton: " + (store.sound ? "an" : "aus");
  $("musicBtn").textContent = "Musik: " + (store.music ? "an" : "aus");
  $("hapticBtn").textContent = "Vibration: " + (store.haptic ? "an" : "aus");
}

// The task's grass, or the bloom that a chicken eats, beside the chicken.
function renderFarmHero() {
  const hero = $("hero");
  const moment = sess.moment;
  const farm = farmOf(garden);
  const eater = eaterOf(sess.feeding);
  hero.className =
    "hero " +
    (eater ? "l4" : patchStage(farm, sess.cur)) +
    (sess.bale === sess.cur ? " bloomed" : "") +
    (moment ? " moment m-" + moment.type : "");
  const heroKey = "farm|" + sess.cur + "|" + (eater ? eater.id : "");
  if (sess.heroKey !== heroKey) {
    sess.heroKey = heroKey;
    hero.innerHTML =
      '<div class="pot">' +
      (eater && sess.feeding
        ? flowerSVG(varietyOf(sess.feeding.flower)) +
          '<span class="eater">' +
          chickenSVG(eater) +
          "</span>"
        : grassSVG()) +
      '</div><div class="stages" aria-hidden="true"><i></i><i></i><i></i><i class="top"></i></div><span class="tag"></span>';
  }
  const fact = farm.facts[sess.cur];
  const level = fact && fact.seen ? fact.lvl : 0;
  hero.querySelectorAll(".stages i").forEach((dot, i) => {
    dot.classList.toggle("on", i < level);
    dot.classList.toggle("pulse", !!moment && sess.grew && i === level - 1);
  });
  if (moment) hero.querySelector(".tag")!.textContent = moment.text;
}

function renderHero() {
  const hero = $("hero");
  const moment = sess.moment;
  hero.className =
    "hero " +
    stage(garden, sess.cur) +
    (thirsty(garden.facts[sess.cur], today()) ? " thirsty" : "") +
    (sess.bloom === sess.cur ? " bloomed" : "") +
    (moment ? " moment m-" + moment.type : "");
  if (sess.heroKey !== sess.cur) {
    sess.heroKey = sess.cur;
    hero.innerHTML =
      '<div class="pot">' +
      flowerSVG(varietyOf(sess.cur)) +
      '</div><div class="stages" aria-hidden="true"><i></i><i></i><i></i><i class="top"></i></div><span class="tag"></span>';
  }
  const fact = garden.facts[sess.cur];
  const level = fact && fact.seen ? fact.lvl : 0;
  hero.querySelectorAll(".stages i").forEach((dot, i) => {
    dot.classList.toggle("on", i < level);
    dot.classList.toggle("pulse", !!moment && sess.grew && i === level - 1);
  });
  if (moment) hero.querySelector(".tag")!.textContent = moment.text;
}

function render() {
  renderGarden();
  renderFarm();
  renderPond();
  renderTask();
  sess.grew = false;
}

function showSummary() {
  const round = sess.round;
  const good = round.right >= round.size * 0.8;
  $("sumScore").innerHTML =
    round.right + "<small> / " + round.size + "</small>";
  $("sumTitle").textContent = round.water
    ? round.right === round.size
      ? "Alle gegossen!"
      : "Gießrunde geschafft!"
    : round.right === round.size
      ? "Alles richtig!"
      : good
        ? "Toll gemacht!"
        : "Runde geschafft!";
  $("sumPoints").textContent = "+" + round.points + " Punkte in dieser Runde";
  quietPond();
  if (pondMode()) pondSummary();
  else if (farmMode()) farmSummary();
  else gardenSummary();
  const missed = $("sumMiss");
  missed.innerHTML = "";
  for (const key of round.missed) {
    missed.appendChild(
      mk(
        "span",
        null,
        pondMode() ? key : key.replace("x", " × ").replace(":", " : "),
      ),
    );
  }
  $("sumMissLab").textContent = pondMode()
    ? "Diese Wörter üben wir weiter:"
    : "Diese Aufgaben gießen wir weiter:";
  $("sumMissWrap").hidden = !round.missed.length;
  $("summary").hidden = false;
  sfx(good ? "fanfare" : "done");
  haptic("bloom");
  if (good) confetti();
  $("again").focus();
}

function pondSummary() {
  const round = sess.round;
  const words = pondWords(pondOf(garden));
  const open = openLilies(pondOf(garden));
  const tips = round.marks.filter((m) => m === "tip").length;
  $("sumGarden").textContent =
    (round.blooms
      ? round.blooms +
        (round.blooms === 1
          ? " neue Seerose blüht! "
          : " neue Seerosen blühen! ")
      : "Dein Teich wächst. ") +
    (tips
      ? tips + (tips === 1 ? " Wort" : " Wörter") + " mit Tipp geschafft. "
      : "") +
    open +
    " von " +
    words.length +
    " Seerosen blühen.";
  $("sumNext").hidden = true;
}

function farmSummary() {
  const { bales, chicks } = sess;
  $("sumGarden").textContent =
    (bales
      ? bales + (bales === 1 ? " neuer Heuballen! " : " neue Heuballen! ")
      : "Deine Wiese wächst. ") +
    (chicks
      ? chicks === 1
        ? "Ein Küken ist geschlüpft! "
        : chicks + " Küken sind geschlüpft! "
      : "") +
    hayPatches(farmOf(garden)) +
    " von 100 sind Heu.";
  $("sumNext").hidden = true;
}

function gardenSummary() {
  const round = sess.round;
  const dry = thirstyKeys(garden, today()).length;
  $("sumGarden").textContent =
    (round.water
      ? dry
        ? "Noch " +
          dry +
          (dry === 1 ? " Blume hat Durst. " : " Blumen haben Durst. ")
        : "Keine Blume hat mehr Durst. "
      : round.blooms
        ? round.blooms +
          (round.blooms === 1 ? " neue Blüte! " : " neue Blüten! ")
        : "Dein Garten wächst. ") +
    bloomCount(garden) +
    " von 100 blühen.";
  const next =
    tomorrowText() +
    (nothingGrows(garden, today()) && garden.rows.length < 10
      ? " " + MORE_ROWS
      : "");
  $("sumNext").textContent = next.trim();
  $("sumNext").hidden = !next.trim();
}

// The row chips of the garden and of the farm.
function buildRows() {
  rowChips(
    "rows",
    "row",
    false,
    () => garden,
    () => factors(sess.cur)[0],
  );
  rowChips(
    "frows",
    "frow",
    true,
    () => farmOf(garden),
    () => divParts(sess.cur)[1],
  );
}

function rowChips(
  id: string,
  prefix: string,
  farm: boolean,
  owner: () => { rows: number[] },
  curRow: () => number,
) {
  const rows = $(id);
  rows.innerHTML = "";
  for (let a = 1; a <= 10; a++) {
    const chip = mk("button", "chip", String(a));
    chip.id = prefix + a;
    chip.setAttribute("aria-pressed", String(owner().rows.includes(a)));
    chip.onclick = () => {
      const o = owner();
      if (o.rows.includes(a)) {
        if (o.rows.length === 1) return;
        o.rows = o.rows.filter((row) => row !== a);
      } else o.rows = [...o.rows, a].sort((x, y) => x - y);
      chip.setAttribute("aria-pressed", String(o.rows.includes(a)));
      save();
      const asked =
        (farm ? farmMode() : store.mode !== "farm" && store.mode !== "pond") &&
        sess.phase === "ask" &&
        !sess.feeding;
      if (asked && !o.rows.includes(curRow())) {
        sess.qn--;
        newTask();
      } else render();
    };
    rows.appendChild(chip);
  }
}

function resetIdle() {
  const area = $("resetArea");
  area.innerHTML =
    '<button class="btn danger" id="resetBtn">Diesen Garten zurücksetzen</button>';
  $("resetBtn").onclick = () => {
    area.innerHTML =
      '<span style="font-weight:700;font-size:.9rem">Alles löschen?</span> <button class="btn solid-danger" id="resetYes">Ja, löschen</button> <button class="btn" id="resetNo">Abbrechen</button>';
    $("resetYes").onclick = () => {
      const next = freshGarden();
      next.rows = garden.rows;
      next.farm = garden.farm;
      next.pond = garden.pond;
      setGarden(next);
      if (store.active) store.data[store.active] = next;
      save();
      sess.streak = 0;
      sess.comeback = [];
      resetIdle();
      startRound();
    };
    $("resetNo").onclick = resetIdle;
  };
}

function activate(id: string) {
  store.active = id;
  setGarden(upgrade((store.data[id] ||= freshGarden())));
  claimGifts(garden);
  save();
  sess.streak = 0;
  sess.comeback = [];
  sess.last = null;
  sess.heroKey = null;
  sess.feed = null;
  sess.hatched = null;
  closeFeed();
  buildPondSettings();
  quietPond();
  sess.shift = false;
  buildRows();
  resetIdle();
  updateWho();
  startRound();
}

// The garden practices the multiplication, the farm the division.
function setMode(mode: Mode) {
  if ((store.mode || "garden") === mode) return;
  store.mode = mode;
  save();
  showMode();
  sess.comeback = [];
  sess.last = null;
  sess.heroKey = null;
  sess.feed = null;
  closeFeed();
  quietPond();
  $("summary").hidden = true;
  sfx("tap");
  startRound();
}

function showMode() {
  const mode = store.mode || "garden";
  document.body.dataset.mode = mode;
  $("modeGarden").setAttribute("aria-pressed", String(mode === "garden"));
  $("modeFarm").setAttribute("aria-pressed", String(mode === "farm"));
  $("modePond").setAttribute("aria-pressed", String(mode === "pond"));
  const look = {
    garden: "Garten ansehen",
    farm: "Hof ansehen",
    pond: "Teich ansehen",
  };
  $("mapBtn").setAttribute(
    "aria-label",
    mode === "farm"
      ? "Bauernhof ansehen"
      : mode === "pond"
        ? "Teich ansehen"
        : "Garten ansehen",
  );
  $("toGarden").textContent = look[mode];
}

// A chicken eats a bloom when the child knows its task: it is the next task.
function pickFlower(chicken: string, flower: string) {
  sess.feed = { chicken, flower };
  scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  // else the next task asks it
  if (sess.phase === "ask" && $("summary").hidden) {
    sess.qn--;
    newTask();
  }
}

export function start() {
  $("pad").addEventListener("click", (e) => {
    const key = (e.target as Element).closest("button");
    if (key) press(key.dataset.k!);
  });
  document.addEventListener("keydown", (e) => {
    if (!$("feed").hidden) {
      if (e.key === "Escape") closeFeed();
      return;
    }
    if (!$("profiles").hidden) {
      if (e.key === "Escape") closeProfiles();
      return;
    }
    if (!$("summary").hidden) {
      if (e.key === "Enter") {
        e.preventDefault();
        $("again").click();
      }
      return;
    }
    if ((e.target as Element | null)?.closest("textarea, input")) return;
    if (pondMode()) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zäöüßA-ZÄÖÜ]$/.test(e.key)) pressPond(e.key);
      else if (e.key === "Backspace") pressPond("del");
      else if (e.key === "Enter") {
        e.preventDefault();
        pressPond("ok");
      }
      return;
    }
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
    else if (e.key === "Enter") {
      e.preventDefault();
      press("ok");
    }
  });
  $("soundBtn").onclick = () => {
    store.sound = !store.sound;
    save();
    render();
    sfx("tap");
  };
  $("musicBtn").onclick = () => {
    store.music = !store.music;
    save();
    render();
    syncMusic();
  };
  $("hapticBtn").onclick = () => {
    store.haptic = !store.haptic;
    save();
    render();
    haptic("good");
  };
  $("again").onclick = () => {
    $("summary").hidden = true;
    startRound();
  };
  $("toGarden").onclick = () => {
    $("again").click();
    showGarden();
  };
  $("mapBtn").onclick = showGarden;
  $("toPlay").onclick =
    $("fToPlay").onclick =
    $("pToPlay").onclick =
      () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  $("modeGarden").onclick = () => setMode("garden");
  $("modeFarm").onclick = () => setMode("farm");
  $("modePond").onclick = () => setMode("pond");
  initSpeech();
  initProfiles(activate);
  initMusic();
  initFullscreen();

  buildGarden();
  buildFarm(pickFlower);
  buildPond({ press: pressPond, changed: pondChanged, render });
  showMode();
  buildRows();
  resetIdle();
  updateWho();
  claimGifts(garden);
  startRound();
  if (!activeProfile() || store.profiles.length > 1) openProfiles();
}
