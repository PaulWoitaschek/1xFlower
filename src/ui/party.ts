import { critterSVG } from "../art/critters";
import type { CritterKind } from "../rules/garden";
import { BUTTERFLY_COLORS } from "../rules/visitors";
import { $, mk, reduce } from "./dom";

type Point = [x: number, y: number];

const clamp = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => t * t * (3 - 2 * t);
const pickColor = () =>
  BUTTERFLY_COLORS[Math.floor(Math.random() * BUTTERFLY_COLORS.length)];

// The head of the task's flower on the screen, after the flower stepped forward.
function flowerHead(): { x: number; y: number; h: number } {
  const r = $("hero").querySelector(".pot")!.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.bottom - r.height * 0.95,
    h: r.height,
  };
}

// A visitor that follows a path over the page. It looks the way it flies.
function fly(
  kind: CritterKind,
  size: number,
  path: (t: number) => Point,
  ms: number,
  delay: number,
) {
  const el = mk("div", "flyer");
  el.style.width = size + "px";
  el.innerHTML = critterSVG({ kind, color: pickColor() });
  document.body.appendChild(el);
  const steps = 44;
  const points = Array.from({ length: steps + 1 }, (_, i) => path(i / steps));
  let dir = 1;
  const frames = points.map(([x, y], i) => {
    const next = points[Math.min(i + 1, steps)][0];
    if (kind === "bee" && Math.abs(next - x) > 0.4) dir = next > x ? 1 : -1;
    const t = i / steps;
    return {
      transform:
        "translate(" +
        (x - size / 2).toFixed(1) +
        "px," +
        (y - size / 2).toFixed(1) +
        "px) scaleX(" +
        dir +
        ")",
      opacity: Math.min(1, t * 10, (1 - t) * 6),
    };
  });
  el.animate(frames, { duration: ms, delay, fill: "both" }).onfinish = () =>
    el.remove();
}

// Bees come from the sides, circle the flower, drink from it and fly off.
export function beeVisit(n: number) {
  if (reduce) return;
  const { x, y } = flowerHead();
  const far = innerWidth / 2 + 60;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const from: Point = [x + side * far, y - 70 + Math.random() * 110];
    const to: Point = [
      x + (Math.random() < 0.5 ? side : -side) * far,
      y - 90 - Math.random() * 90,
    ];
    const turns = 1.2 + Math.random() * 0.6;
    const start = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * 22;
    fly(
      "bee",
      26,
      (t) => {
        const come = ease(clamp(t / 0.36));
        const go = ease(clamp((t - 0.74) / 0.26));
        const r =
          radius *
          (t < 0.34
            ? ease(clamp((t - 0.08) / 0.26))
            : 1 - ease(clamp((t - 0.34) / 0.3)));
        const angle =
          start + side * turns * Math.PI * 2 * clamp((t - 0.08) / 0.56);
        const bob = Math.sin(t * 60) * 2.5;
        return [
          from[0] +
            (x - from[0]) * come +
            (to[0] - x) * go +
            Math.cos(angle) * r,
          from[1] +
            (y - from[1]) * come +
            (to[1] - y) * go +
            Math.sin(angle) * r * 0.7 +
            bob,
        ];
      },
      2300 + Math.random() * 400,
      i * 220,
    );
  }
}

// Butterflies rise from the flower and flutter away in all directions.
export function butterflyBurst(n: number) {
  if (reduce) return;
  const { x, y } = flowerHead();
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI * (0.12 + (0.76 * (i + Math.random() * 0.6)) / n);
    const far = 130 + Math.random() * 90;
    const waves = 2 + Math.random() * 1.5;
    const swing = 12 + Math.random() * 10;
    fly(
      "bfly",
      30,
      (t) => {
        const out = 1 - (1 - t) * (1 - t);
        const side = Math.sin(t * Math.PI * 2 * waves) * swing * t;
        return [
          x + Math.cos(angle) * far * out - Math.sin(angle) * side,
          y + Math.sin(angle) * far * out + Math.cos(angle) * side - 30 * t,
        ];
      },
      2100 + Math.random() * 500,
      150 + i * 110,
    );
  }
}

// One visitor passes the flower: a bee that drinks or a butterfly on its way.
export function passerBy() {
  if (reduce) return;
  if (Math.random() < 0.5) {
    beeVisit(1);
    return;
  }
  const { x, y } = flowerHead();
  const side = Math.random() < 0.5 ? 1 : -1;
  const far = innerWidth / 2 + 50;
  const waves = 2.5 + Math.random();
  fly(
    "bfly",
    30,
    (t) => [
      x - side * far + side * far * 2 * t,
      y -
        34 +
        Math.sin(t * Math.PI * 2 * waves) * 14 -
        Math.sin(t * Math.PI) * 18,
    ],
    2400,
    100,
  );
}

const RAINBOW = [
  "#FF5A5F",
  "#FF9F43",
  "#FFC93C",
  "#5CC46E",
  "#6EC6FF",
  "#B79CFF",
];

// A rainbow grows over the flower when a whole row blooms or a gift arrives.
export function rainbow() {
  endRainbow();
  const el = mk("div", "rainbow");
  el.innerHTML =
    '<svg viewBox="0 0 120 62" aria-hidden="true">' +
    RAINBOW.map((color, i) => {
      const r = 54 - i * 5;
      return (
        '<path pathLength="1" style="--i:' +
        i +
        '" d="M' +
        (60 - r) +
        " 61A" +
        r +
        " " +
        r +
        " 0 0 1 " +
        (60 + r) +
        ' 61" stroke="' +
        color +
        '"/>'
      );
    }).join("") +
    "</svg>";
  $("hero").appendChild(el);
}

export function endRainbow() {
  $("hero").querySelector(".rainbow")?.remove();
}
