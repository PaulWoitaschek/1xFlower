import { critterSVG } from "../art/critters";
import { DECO, FENCE, sized } from "../art/deco";
import { FLOWERS, flowerColor, flowerSVG, treeSVG } from "../art/flowers";
import {
  factors,
  keyOf,
  rowComplete,
  stage,
  type Critter,
} from "../rules/garden";
import { $, mk, reduce } from "./dom";
import { flowerPoint } from "./particles";
import { garden, sess, store } from "./state";

const cells: Record<string, HTMLElement> = {};
const mapCells: Record<string, HTMLElement> = {};
const arriving = new Set<string>();
let yardKey = "";

export function buildGarden() {
  const grid = $("grid");
  const map = $("map");
  grid.innerHTML = "";
  map.innerHTML = "";
  grid.appendChild(mk("div", "lab", "×"));
  for (let b = 1; b <= 10; b++) grid.appendChild(mk("div", "lab", String(b)));
  grid.appendChild(mk("div", "lab star", "★")).title =
    "Ein Baum für jede Reihe, die ganz blüht";
  for (let a = 1; a <= 10; a++) {
    grid.appendChild(mk("div", "lab", String(a)));
    for (let b = 1; b <= 10; b++) {
      const key = keyOf(a, b);
      const cell = mk("div", "cell " + stage(garden, key));
      cell.title = a + " × " + b;
      cell.innerHTML = flowerSVG(a);
      grid.appendChild(cell);
      cells[key] = cell;
      const dot = mk("i");
      dot.style.cssText =
        "--pc:" + FLOWERS[a - 1][0] + ";--cc:" + FLOWERS[a - 1][1];
      map.appendChild(dot);
      mapCells[key] = dot;
    }
    const tree = mk("div", "tree");
    tree.id = "tree" + a;
    tree.title = "Baum der " + a + "er-Reihe";
    tree.innerHTML = treeSVG(a);
    grid.appendChild(tree);
    map.appendChild(mk("i", "t")).id = "mtree" + a;
  }
}

export function buildLegend() {
  const items: [stage: string, name: string, row: number][] = [
    ["u", "Samen", 1],
    ["l1", "Keim", 1],
    ["l3", "Knospe", 7],
    ["l4", "Blüte", 2],
    ["wilt", "Verwelkt", 6],
  ];
  $("legend").innerHTML = items
    .map(
      ([stage, name, row]) =>
        '<span class="lg"><span class="lgf ' +
        stage +
        '">' +
        flowerSVG(row) +
        "</span>" +
        name +
        "</span>",
    )
    .join("");
}

function renderCritters(landed?: string) {
  const at: Record<string, Critter> = {};
  for (const c of garden.critters) if (!arriving.has(c.id)) at[c.key] = c;
  for (const key in cells) {
    const cell = cells[key];
    const want = at[key];
    let el = cell.querySelector<HTMLElement>(".critter");
    if (el && (!want || el.dataset.id !== want.id)) {
      el.remove();
      el = null;
    }
    if (want && !el) {
      el = mk("span", "critter" + (want.id === landed ? " new" : ""));
      el.dataset.id = want.id;
      el.innerHTML = critterSVG(want);
      cell.appendChild(el);
    }
  }
}

function renderYard() {
  const key = store.active + "|" + garden.deco.join();
  if (yardKey === key) return;
  yardKey = key;
  const items = DECO.filter((d) => !d.fence && garden.deco.includes(d.id)).sort(
    (x, y) => x.pos! - y.pos!,
  );
  $("yard").innerHTML =
    (garden.deco.includes("zaun") ? FENCE : "") +
    '<div class="yard-items">' +
    items
      .map(
        (d) =>
          "<span" +
          (d.id === sess.newDeco ? ' class="new"' : "") +
          ' title="' +
          d.name +
          '">' +
          sized(d, d.h) +
          "</span>",
      )
      .join("") +
    "</div>" +
    (garden.deco.length
      ? ""
      : "<p>Für Blüten bekommst du Geschenke für deinen Garten.</p>");
  $("gifts").innerHTML = DECO.map((d) => {
    const own = garden.deco.includes(d.id);
    return (
      '<span class="gift' +
      (own ? " got" : "") +
      '" title="' +
      d.name +
      '">' +
      sized(d, 30) +
      (own ? "Im Garten" : d.at + " Blüten") +
      "</span>"
    );
  }).join("");
}

export function renderGarden() {
  let blooms = 0;
  for (const key in cells) {
    const st = stage(garden, key);
    const off = garden.rows.includes(factors(key)[0]) ? "" : " off";
    const cur = key === sess.cur;
    if (st === "l4") blooms++;
    const cls =
      "cell " +
      st +
      off +
      (cur ? " cur" : "") +
      (key === sess.bloom ? " bloomed" : "");
    if (cells[key].className !== cls) cells[key].className = cls;
    const mapCls = st + off + (!cur ? "" : sess.grew ? " cur grew" : " cur");
    if (mapCells[key].className !== mapCls) mapCells[key].className = mapCls;
  }
  let trees = 0;
  for (let row = 1; row <= 10; row++) {
    const done = rowComplete(garden, row);
    if (done) trees++;
    const off = garden.rows.includes(row) ? "" : " off";
    const tree = $("tree" + row);
    const cls =
      "tree" +
      (done ? " done" : "") +
      (done && row === sess.newTree ? " new" : "") +
      off;
    if (tree.className !== cls) tree.className = cls;
    $("mtree" + row).className = "t" + (done ? " done" : "") + off;
  }
  renderCritters();
  renderYard();
  const critters = garden.critters.length;
  $("sBlooms").textContent = String(blooms);
  $("gCount").textContent =
    blooms +
    " von 100 blühen" +
    (trees ? " · " + trees + (trees === 1 ? " Baum" : " Bäume") : "") +
    (critters ? " · " + critters + (critters === 1 ? " Tier" : " Tiere") : "");
  $("mapCap").textContent = blooms + " von 100 blühen";
}

function critterTop(key: string) {
  const st = stage(garden, key);
  return st === "l3" || st === "l4" ? 0.02 : 0.58;
}

// The visitor flies from the task's flower to its plant and shows there after it lands.
export function flyCritter(c: Critter) {
  arriving.add(c.id);
  const land = () => {
    arriving.delete(c.id);
    renderCritters(c.id);
  };
  if (reduce) {
    land();
    return;
  }
  const from = $("hero").querySelector(".pot")!.getBoundingClientRect();
  const to = cells[c.key].getBoundingClientRect();
  const size = 40;
  const end = to.width * 0.64;
  const el = mk("div", "flyer");
  el.style.width = size + "px";
  el.innerHTML = critterSVG(c);
  document.body.appendChild(el);
  const sx = from.left + from.width / 2 - size / 2;
  const sy = from.top + from.height * 0.25 - size / 2;
  const ex = to.left + to.width / 2 - size / 2;
  const ey = to.top + to.height * critterTop(c.key) + end / 2 - size / 2;
  const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 160;
  const my = Math.min(sy, ey) - 90;
  const flight = el.animate(
    [
      {
        transform: "translate(" + sx + "px," + sy + "px) scale(.3)",
        opacity: 0,
      },
      {
        transform: "translate(" + sx + "px," + (sy - 30) + "px) scale(1)",
        opacity: 1,
        offset: 0.12,
      },
      {
        transform:
          "translate(" + mx + "px," + my + "px) scale(1.2) rotate(-12deg)",
        offset: 0.5,
      },
      {
        transform:
          "translate(" + ex + "px," + ey + "px) scale(" + end / size + ")",
      },
    ],
    { duration: 1700, easing: "ease-in-out" },
  );
  flight.onfinish = () => {
    el.remove();
    land();
  };
}

// On phones, a dot flies from the task's flower to its plant on the map.
export function flyToMap() {
  const dot = mapCells[sess.cur];
  if (reduce || !dot.offsetParent) return;
  const { x, y } = flowerPoint();
  const to = dot.getBoundingClientRect();
  const el = mk("i", "seedfly");
  el.style.background = flowerColor(factors(sess.cur)[0]);
  document.body.appendChild(el);
  el.animate(
    [
      { transform: "translate(" + x + "px," + y + "px) scale(2)" },
      {
        transform:
          "translate(" +
          (to.left + to.width / 2) +
          "px," +
          (to.top + to.height / 2) +
          "px)",
      },
    ],
    { duration: 500, easing: "ease-in" },
  ).onfinish = () => el.remove();
}

export function showGarden() {
  $("garden").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
}
