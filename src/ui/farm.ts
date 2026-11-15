import {
  baleSVG,
  barnSVG,
  chickenSVG,
  grassSVG,
  haystackSVG,
  HEN_NAMES,
  nestSVG,
} from "../art/farm";
import { flowerSVG, varietyOf } from "../art/flowers";
import {
  CHICK_MEALS,
  divKey,
  divParts,
  EGG_WARMTH,
  farmOf,
  feedableBlooms,
  feedHay,
  full,
  LAY_MEALS,
  patchStage,
  rowHay,
  type Chicken,
  type Meal,
} from "../rules/farm";
import { factors } from "../rules/garden";
import { $, mk } from "./dom";
import { flyDot } from "./garden";
import { haptic } from "./haptics";
import { confetti, hearts } from "./particles";
import { sfx } from "./sound";
import { garden, save, sess, store } from "./state";

export const GRASS = "#6DBE4B";
export const HAY = "#E9C46A";

const patches: Record<string, HTMLElement> = {};
const dots: Record<string, HTMLElement> = {};
let yardKey = "";
/** the chicken in the feed sheet */
let eater: string | null = null;
let onFlower: (chicken: string, flower: string) => void;

const farmMode = () => store.mode === "farm";

// `pickFlower` asks the task of a bloom that a chicken eats.
export function buildFarm(
  pickFlower: (chicken: string, flower: string) => void,
) {
  onFlower = pickFlower;
  const grid = $("fgrid");
  const map = $("fmap");
  grid.appendChild(mk("div", "lab", ":"));
  for (let q = 1; q <= 10; q++) grid.appendChild(mk("div", "lab", " "));
  grid.appendChild(mk("div", "lab star", "★")).title =
    "Ein Heuhaufen für jede Reihe, die ganz Heu ist";
  for (let d = 1; d <= 10; d++) {
    grid.appendChild(mk("div", "lab", String(d)));
    for (let q = 1; q <= 10; q++) {
      const key = divKey(d, q);
      const cell = mk("div", "cell u");
      cell.title = d * q + " : " + d;
      cell.innerHTML = grassSVG();
      grid.appendChild(cell);
      patches[key] = cell;
      const dot = mk("i");
      dot.style.cssText = "--pc:" + HAY + ";--cc:#B98A2E";
      map.appendChild(dot);
      dots[key] = dot;
    }
    const stack = mk("div", "tree");
    stack.id = "stack" + d;
    stack.title = "Heuhaufen der " + d + "er-Reihe";
    stack.innerHTML = haystackSVG();
    grid.appendChild(stack);
    map.appendChild(mk("i", "t")).id = "mstack" + d;
  }
  $("barnyard").addEventListener("click", (e) => {
    const bird = (e.target as Element).closest<HTMLElement>("[data-id]");
    if (bird) openFeed(bird.dataset.id!);
  });
  $("feedHay").onclick = () => {
    const id = eater;
    if (!id) return;
    const meal = feedHay(farmOf(garden), id);
    closeFeed();
    if (!meal) return;
    save();
    renderFarm();
    celebrate(id, meal);
  };
  $("feedClose").onclick = closeFeed;
}

export function renderFarm() {
  const farm = farmOf(garden);
  const cur = farmMode() ? sess.cur : "";
  let hay = 0;
  for (const key in patches) {
    const st = patchStage(farm, key);
    if (st === "l4") hay++;
    const off = farm.rows.includes(divParts(key)[1]) ? "" : " off";
    const here = key === cur;
    const cls =
      "cell " +
      st +
      off +
      (here ? " cur" : "") +
      (key === sess.bale ? " bloomed" : "");
    if (patches[key].className !== cls) patches[key].className = cls;
    const dotCls = st + off + (!here ? "" : sess.grew ? " cur grew" : " cur");
    if (dots[key].className !== dotCls) dots[key].className = dotCls;
  }
  let stacks = 0;
  for (let d = 1; d <= 10; d++) {
    const done = rowHay(farm, d);
    if (done) stacks++;
    const off = farm.rows.includes(d) ? "" : " off";
    const cls =
      "tree" +
      (done ? " done" : "") +
      (d === sess.newStack ? " new" : "") +
      off;
    const stack = $("stack" + d);
    if (stack.className !== cls) stack.className = cls;
    $("mstack" + d).className = "t" + (done ? " done" : "") + off;
  }
  const birds = farm.chickens.length;
  $("fCount").textContent =
    hay +
    " von 100 sind Heu · " +
    farm.hay +
    " Heu in der Scheune" +
    (stacks ? " · " + stacks + " Heuhaufen" : "") +
    (birds ? " · " + birds + (birds === 1 ? " Huhn" : " Hühner") : "");
  if (farmMode()) {
    $("sBloomsLab").textContent = "Heu";
    $("sBlooms").textContent = String(farm.hay);
    $("mapCap").textContent = hay + " von 100 sind Heu";
  }
  renderYard();
}

function meals(c: Chicken) {
  const need = c.grown ? LAY_MEALS : CHICK_MEALS;
  let s = '<span class="meals" aria-hidden="true">';
  for (let i = 0; i < need; i++)
    s += i < c.meals ? '<i class="on"></i>' : "<i></i>";
  return s + "</span>";
}

const birdName = (c: Chicken) => (c.grown ? "Huhn" : "Küken");

function renderYard() {
  const farm = farmOf(garden);
  const key = JSON.stringify([
    store.active,
    farm.hay,
    farm.eggs,
    farm.chickens,
  ]);
  if (yardKey === key) return;
  yardKey = key;
  const egg = farm.eggs[0];
  const left = egg ? EGG_WARMTH - egg.warmth : 0;
  const flock = farm.chickens
    .map(
      (c) =>
        '<button class="bird' +
        (c.grown ? "" : " small") +
        (full(farm, c) ? " full" : "") +
        (c.id === sess.hatched ? " new" : "") +
        '" data-id="' +
        c.id +
        '" aria-label="' +
        birdName(c) +
        ' füttern">' +
        chickenSVG(c) +
        meals(c) +
        "</button>",
    )
    .join("");
  $("barnyard").innerHTML =
    '<div class="barnbox" title="Scheune">' +
    barnSVG(farm.hay) +
    '<span class="haycount">' +
    baleSVG() +
    "<b>" +
    farm.hay +
    "</b></span></div>" +
    '<div class="nest" title="Nest">' +
    nestSVG(farm.eggs) +
    "<span>" +
    (egg
      ? "Noch " + left + (left === 1 ? " Antwort" : " Antworten")
      : "Das Nest ist leer") +
    "</span></div>" +
    '<div class="flock" id="flock">' +
    (flock ||
      "<p>Wenn du Aufgaben richtig rechnest, schlüpft aus dem Ei ein Küken.</p>") +
    "</div>";
  $("fHint").textContent = farm.chickens.length
    ? "Tippe ein Küken oder ein Huhn an, um es zu füttern. Es frisst Heu oder Blumen aus deinem Garten."
    : "Jede richtige Antwort lässt Gras wachsen. Hohes Gras wird zu Heu für die Hühner.";
}

// What a meal did, for the note and the feedback.
export function mealText(c: Chicken, meal: Meal): string {
  if (meal.grown)
    return "Dein Küken ist jetzt ein " + HEN_NAMES[c.color] + " Huhn!";
  if (meal.egg) return "Dein Huhn hat ein Ei gelegt!";
  if (!c.grown) {
    const left = CHICK_MEALS - c.meals;
    return "Mmh, lecker! Noch " + left + " Mal füttern, dann ist es groß.";
  }
  return "Mmh, lecker!";
}

function celebrate(id: string, meal: Meal) {
  const c = farmOf(garden).chickens.find((c) => c.id === id)!;
  $("fNote").textContent = mealText(c, meal);
  const bird = $("barnyard").querySelector<HTMLElement>(
    '[data-id="' + id + '"]',
  );
  if (bird) {
    const r = bird.getBoundingClientRect();
    hearts(
      r.left + r.width / 2,
      r.top + r.height * 0.3,
      meal.grown || meal.egg ? 12 : 6,
      r.width,
    );
    bird.classList.add("munch");
  }
  if (meal.grown || meal.egg) {
    sfx("fanfare");
    haptic("bloom");
    confetti();
  } else {
    sfx("peep");
    haptic("good");
  }
}

function openFeed(id: string) {
  const farm = farmOf(garden);
  const c = farm.chickens.find((c) => c.id === id);
  if (!c) return;
  eater = id;
  const sated = full(farm, c);
  $("feedWho").innerHTML = chickenSVG(c);
  $("feedTitle").textContent = sated
    ? "Dein Huhn ist satt"
    : "Was frisst dein " + birdName(c) + "?";
  const left = (c.grown ? LAY_MEALS : CHICK_MEALS) - c.meals;
  $("feedNeed").textContent = sated
    ? "Es legt ein Ei, wenn im Nest wieder Platz ist."
    : "Noch " +
      left +
      " Mal füttern, dann " +
      (c.grown ? "legt es ein Ei." : "ist es groß.");
  const hay = $<HTMLButtonElement>("feedHay");
  hay.hidden = sated;
  hay.disabled = !farm.hay;
  hay.innerHTML =
    baleSVG() +
    (farm.hay ? "Heu geben (" + farm.hay + " da)" : "Kein Heu in der Scheune");
  const blooms = feedableBlooms(garden);
  $("feedFlowerWrap").hidden = sated;
  $("feedNone").hidden = !!blooms.length;
  const list = $("feedFlowers");
  list.innerHTML = "";
  for (const key of blooms) {
    const button = mk("button", "l4");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      "Blume aus der " + factors(key)[0] + "er-Reihe",
    );
    button.innerHTML = flowerSVG(varietyOf(key));
    button.onclick = () => {
      closeFeed();
      onFlower(id, key);
    };
    list.appendChild(button);
  }
  $("feed").hidden = false;
  sfx("tap");
  (sated ? $("feedClose") : hay.disabled ? $("feedClose") : hay).focus();
}

export function closeFeed() {
  eater = null;
  $("feed").hidden = true;
}

// On phones, a dot flies from the task's grass to its patch on the map.
export function flyToFarmMap() {
  const dot = dots[sess.cur];
  if (dot) flyDot(dot, GRASS);
}
