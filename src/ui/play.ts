import { CRITTER_NAMES } from "../art/critters";
import { sized } from "../art/deco";
import { flowerSVG, varietyOf } from "../art/flowers";
import { answer, multiplier, newRound, ROUND } from "../rules/answer";
import {
  bloomCount,
  bloomingNeighbours,
  dayOf,
  factors,
  freshGarden,
  stage,
} from "../rules/garden";
import { claimGifts, nextGift } from "../rules/gifts";
import { pickNext } from "../rules/pick";
import { upgrade } from "../rules/storage";
import { $, mk, reduce } from "./dom";
import {
  buildGarden,
  flyCritter,
  flyToMap,
  renderGarden,
  showGarden,
} from "./garden";
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
import { sfx } from "./sound";
import { activeProfile, garden, save, sess, setGarden, store } from "./state";

const PRAISE = ["Super!", "Klasse!", "Genau!", "Stark!", "Richtig!", "Spitze!"];

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

function hint() {
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

function newTask() {
  if (sess.round.n >= ROUND) {
    showSummary();
    return;
  }
  sess.qn++;
  sess.cur = pickNext(garden, sess, dayOf(Date.now()));
  sess.input = "";
  sess.phase = "ask";
  sess.t0 = performance.now();
  sess.bloom = null;
  sess.friends = [];
  sess.moment = null;
  sess.newTree = null;
  sess.newDeco = null;
  setFb("", hint());
  endRainbow();
  render();
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

function submit() {
  if (!sess.input || sess.phase === "ok") return;
  const [a, b] = factors(sess.cur);
  const product = a * b;
  const value = +sess.input;
  if (sess.phase === "fix") {
    if (value === product) {
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
  const result = answer(garden, sess, sess.cur, value, fast, dayOf(Date.now()));
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

  const { points, before, bloom, rest, rowDone, freshAgain, gift, visitor } =
    result;
  let sub = "+" + points + " Punkte" + (fast ? " (schnell!)" : "");
  if (rowDone) {
    sub = "Die " + a + "er-Reihe blüht! Ein Baum wächst.";
    sess.newTree = a;
  } else if (gift) sub = sized(gift, 24) + "Geschenk: " + gift.name + "!";
  else if (visitor)
    sub = CRITTER_NAMES[visitor.kind] + " zieht ein! (+" + points + ")";
  else if (bloom) sub = "Neue Blüte! " + sub;
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
            : rest
              ? "Ruht bis morgen"
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

function press(k: string) {
  if (sess.phase === "ok" || !$("summary").hidden || !$("profiles").hidden)
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
  const [a, b] = factors(sess.cur);
  $("qa").textContent = String(a);
  $("qb").textContent = String(b);
  const ans = $("ans");
  ans.textContent = sess.input || "?";
  ans.classList.toggle("empty", !sess.input);
  const task = $("task");
  task.classList.toggle("fix", sess.phase === "fix");
  task.classList.toggle("ok", sess.phase === "ok");
  $("sPoints").textContent = String(garden.points);
  $("sStreak").textContent = String(sess.streak);
  const mult = multiplier(sess.streak);
  $("sMult").hidden = mult === 1;
  $("sMult").textContent = "×" + mult;
  $("bestText").textContent = "Beste Serie: " + garden.best;
  const shown = Math.min(sess.round.n + (sess.phase === "ask" ? 1 : 0), ROUND);
  $("roundText").textContent =
    "Aufgabe " + Math.max(shown, 1) + " von " + ROUND;
  const progress = $("progress");
  progress.innerHTML = "";
  for (let i = 0; i < ROUND; i++) {
    const now = i === sess.round.n && sess.phase === "ask";
    progress.appendChild(mk("i", sess.round.marks[i] || (now ? "now" : null)));
  }

  const hero = $("hero");
  const moment = sess.moment;
  hero.className =
    "hero " +
    stage(garden, sess.cur) +
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

  $("soundBtn").textContent = "Ton: " + (store.sound ? "an" : "aus");
  $("hapticBtn").textContent = "Vibration: " + (store.haptic ? "an" : "aus");
}

function render() {
  renderGarden();
  renderTask();
  sess.grew = false;
}

function showSummary() {
  const round = sess.round;
  $("sumScore").innerHTML = round.right + "<small> / " + ROUND + "</small>";
  $("sumTitle").textContent =
    round.right === ROUND
      ? "Alles richtig!"
      : round.right >= 16
        ? "Toll gemacht!"
        : "Runde geschafft!";
  $("sumPoints").textContent = "+" + round.points + " Punkte in dieser Runde";
  $("sumGarden").textContent =
    (round.blooms
      ? round.blooms + (round.blooms === 1 ? " neue Blüte! " : " neue Blüten! ")
      : "Dein Garten wächst. ") +
    bloomCount(garden) +
    " von 100 blühen.";
  const missed = $("sumMiss");
  missed.innerHTML = "";
  for (const key of round.missed) {
    missed.appendChild(mk("span", null, key.replace("x", " × ")));
  }
  $("sumMissWrap").hidden = !round.missed.length;
  $("summary").hidden = false;
  sfx(round.right >= 16 ? "fanfare" : "done");
  haptic("bloom");
  if (round.right >= 16) confetti();
  $("again").focus();
}

function buildRows() {
  const rows = $("rows");
  rows.innerHTML = "";
  for (let a = 1; a <= 10; a++) {
    const chip = mk("button", "chip", String(a));
    chip.id = "row" + a;
    chip.setAttribute("aria-pressed", String(garden.rows.includes(a)));
    chip.onclick = () => {
      if (garden.rows.includes(a)) {
        if (garden.rows.length === 1) return;
        garden.rows = garden.rows.filter((row) => row !== a);
      } else garden.rows = [...garden.rows, a].sort((x, y) => x - y);
      chip.setAttribute("aria-pressed", String(garden.rows.includes(a)));
      save();
      if (!garden.rows.includes(factors(sess.cur)[0]) && sess.phase === "ask") {
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
      setGarden(next);
      if (store.active) store.data[store.active] = next;
      save();
      sess.streak = 0;
      sess.comeback = [];
      sess.round = newRound();
      resetIdle();
      newTask();
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
  sess.round = newRound();
  buildRows();
  resetIdle();
  updateWho();
  newTask();
}

export function start() {
  $("pad").addEventListener("click", (e) => {
    const key = (e.target as Element).closest("button");
    if (key) press(key.dataset.k!);
  });
  document.addEventListener("keydown", (e) => {
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
  $("hapticBtn").onclick = () => {
    store.haptic = !store.haptic;
    save();
    render();
    haptic("good");
  };
  $("again").onclick = () => {
    $("summary").hidden = true;
    sess.round = newRound();
    newTask();
  };
  $("toGarden").onclick = () => {
    $("again").click();
    showGarden();
  };
  $("mapBtn").onclick = showGarden;
  $("toPlay").onclick = () =>
    scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  initProfiles(activate);

  buildGarden();
  buildRows();
  resetIdle();
  updateWho();
  claimGifts(garden);
  newTask();
  if (!activeProfile() || store.profiles.length > 1) openProfiles();
}
