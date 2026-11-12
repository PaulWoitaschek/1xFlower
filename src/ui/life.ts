import { critterSVG } from "../art/critters";
import { bloomCount, guests, stage } from "../rules/garden";
import { BUTTERFLY_COLORS } from "../rules/visitors";
import { $, mk, reduce } from "./dom";
import { hearts } from "./particles";
import { garden } from "./state";

type GuestKind = "bee" | "bfly";

interface Guest {
  el: HTMLElement;
  kind: GuestKind;
  x: number;
  y: number;
  /** the bloom that the guest visits */
  key: string | null;
  /** time of the next flight */
  next: number;
}

const SPEED: Record<GuestKind, number> = { bee: 120, bfly: 70 };
const REST: Record<GuestKind, [min: number, more: number]> = {
  bee: [1200, 2600],
  bfly: [2600, 4200],
};

let cells: Record<string, HTMLElement> = {};
let all: Guest[] = [];
let timer = 0;

export function initLife(gardenCells: Record<string, HTMLElement>) {
  cells = gardenCells;
}

const blooms = () =>
  Object.keys(cells).filter((key) => stage(garden, key) === "l4");

// The guests are as big as the plants allow.
function sizeOf(kind: GuestKind) {
  const cell = cells["1x1"].offsetWidth;
  return Math.round(
    Math.min(26, Math.max(14, cell * 0.6)) * (kind === "bee" ? 1 : 1.2),
  );
}

function place(guest: Guest, x: number, y: number, seconds: number) {
  const size = guest.el.offsetWidth;
  guest.el.classList.toggle("left", x < guest.x);
  guest.el.style.transition = seconds
    ? "transform " + seconds.toFixed(2) + "s ease-in-out, opacity .6s"
    : "none";
  guest.el.style.transform =
    "translate(" + (x - size / 2) + "px," + (y - size / 2) + "px)";
  guest.x = x;
  guest.y = y;
}

// The guest flies to a bloom and rests there for a while.
function hop(guest: Guest, to?: string) {
  const open = blooms();
  if (!open.length) return;
  const others = open.filter((key) => key !== guest.key);
  const pool = others.length ? others : open;
  const key = to || pool[Math.floor(Math.random() * pool.length)];
  const cell = cells[key];
  guest.el.style.width = sizeOf(guest.kind) + "px";
  const x =
    cell.offsetLeft + cell.offsetWidth * (0.5 + (Math.random() - 0.5) * 0.5);
  const y =
    cell.offsetTop + cell.offsetHeight * (0.24 + (Math.random() - 0.5) * 0.2);
  const seconds = Math.min(
    3.4,
    Math.max(0.7, Math.hypot(x - guest.x, y - guest.y) / SPEED[guest.kind]),
  );
  guest.el.style.opacity = "1";
  place(guest, x, y, seconds);
  guest.key = key;
  const [min, more] = REST[guest.kind];
  guest.next = performance.now() + seconds * 1000 + min + Math.random() * more;
}

function tick() {
  const bed = $("life").getBoundingClientRect();
  if (bed.bottom < 0 || bed.top > innerHeight) return;
  const now = performance.now();
  for (const guest of all) if (now >= guest.next) hop(guest);
}

function add(kind: GuestKind) {
  const layer = $("life");
  const el = mk("span", "guest " + kind);
  el.innerHTML =
    '<span class="bob">' +
    critterSVG({
      kind,
      color: BUTTERFLY_COLORS[all.length % BUTTERFLY_COLORS.length],
    }) +
    "</span>";
  el.style.width = sizeOf(kind) + "px";
  layer.appendChild(el);
  // each guest comes in over the top edge of the garden
  const guest: Guest = { el, kind, x: 0, y: 0, key: null, next: 0 };
  el.style.opacity = "0";
  place(guest, layer.offsetWidth * (0.1 + Math.random() * 0.8), -12, 0);
  guest.next = performance.now() + 300 + Math.random() * 1500;
  all.push(guest);
}

// As many bees and butterflies fly in the garden as its blooms draw.
export function tendLife() {
  if (reduce) return;
  const want = guests(bloomCount(garden));
  for (const kind of ["bee", "bfly"] as const) {
    const count = kind === "bee" ? want.bees : want.butterflies;
    const have = all.filter((guest) => guest.kind === kind);
    for (let i = have.length; i < count; i++) add(kind);
    for (const guest of have.slice(count)) {
      guest.el.remove();
      all = all.filter((other) => other !== guest);
    }
  }
  if (all.length && !timer) timer = window.setInterval(tick, 400);
  if (!all.length && timer) {
    clearInterval(timer);
    timer = 0;
  }
}

// The blooms next to a new bloom send it hearts, and the bees come to see it.
export function greetBloom(key: string, friends: string[]) {
  if (reduce) return;
  all
    .filter((guest) => guest.kind === "bee")
    .slice(0, 3)
    .forEach((guest, i) => {
      guest.next = Infinity;
      setTimeout(() => hop(guest, key), 250 + i * 350);
    });
  setTimeout(() => {
    for (const friend of [key, ...friends]) {
      const r = cells[friend].getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || !r.width) continue;
      hearts(
        r.left + r.width / 2,
        r.top + r.height * 0.2,
        friend === key ? 3 : 2,
        r.width * 0.5,
      );
    }
  }, 700);
}
