import { factors } from "../rules/garden";

/* petal color and center color */
export const COLORS: [petal: string, center: string][] = [
  ["#FF8FA3", "#FFD25E"],
  ["#FFC93C", "#7A3F14"],
  ["#B79CFF", "#FFE27A"],
  ["#6EC6FF", "#FFF1A8"],
  ["#FF9F43", "#7A3E12"],
  ["#F368E0", "#FFE08A"],
  ["#FF5A5F", "#FFE08A"],
  ["#FFFFFF", "#F2A922"],
  ["#8E7CFF", "#FFD25E"],
  ["#FFB4A2", "#E2566A"],
  ["#52D3C2", "#FFF1A8"],
  ["#E0457B", "#FFD25E"],
];

export const KINDS = [
  "blossom",
  "daisy",
  "star",
  "tulip",
  "sunflower",
  "rose",
  "poppy",
  "hyacinth",
  "cosmos",
  "pansy",
  "dahlia",
  "heart",
] as const;

const LEAVES = 3;

/** The look of one plant: its kind of flower, its color and its leaves. */
export interface Variety {
  kind: number;
  color: number;
  leaf: number;
}

// A fixed shuffle of 0..99, so that each plant keeps its flower on each visit.
const ORDER = (() => {
  const order = Array.from({ length: 100 }, (_, i) => i);
  let seed = 20240917;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
})();

// Each of the 100 plants grows into a flower of its own: no two share kind and color.
export function varietyOf(key: string): Variety {
  const [a, b] = factors(key);
  const n = ORDER[(a - 1) * 10 + (b - 1)];
  const kind = n % KINDS.length;
  const color = (Math.floor(n / KINDS.length) * 5 + kind * 7) % COLORS.length;
  return { kind, color, leaf: n % LEAVES };
}

// The ten flowers that a profile can pick. The colors match the flowers of older profiles.
const AVATAR_KINDS = [0, 4, 7, 8, 3, 10, 6, 1, 9, 11];
export function avatarVariety(flower: number): Variety {
  const i = (((flower - 1) % 10) + 10) % 10;
  return { kind: AVATAR_KINDS[i], color: i, leaf: 0 };
}

const shown = (color: number) => {
  const [petal, center] = COLORS[color];
  return petal === "#FFFFFF" ? center : petal;
};

// the white flower shows its center color where white is hard to see
export const flowerColor = (v: Variety) => shown(v.color);
export const rowColor = (row: number) => shown(row - 1);

function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) =>
    parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  let out = "#";
  for (let i = 0; i < 3; i++) {
    const value = Math.round(ch(a, i) * (1 - t) + ch(b, i) * t);
    out += value.toString(16).padStart(2, "0");
  }
  return out;
}

// `n` copies of a shape in a circle around the middle of the flower head
function ring(n: number, shape: string, fill: string, turn = 0): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    const angle = +((i * 360) / n + turn).toFixed(1);
    s +=
      "<" +
      shape +
      ' fill="' +
      fill +
      '"' +
      (angle ? ' transform="rotate(' + angle + ' 20 12)"' : "") +
      "/>";
  }
  return s;
}

const dot = (x: number, y: number, r: number, fill: string, more = "") =>
  '<circle cx="' +
  x +
  '" cy="' +
  y +
  '" r="' +
  r +
  '" fill="' +
  fill +
  '"' +
  more +
  "/>";

const PLAIN = ' stroke="none"';
const DARK = "#2A2016";

interface Head {
  petals: string;
  center: string;
}

function head(v: Variety): Head {
  const [pc, cc] = COLORS[v.color];
  const dark = mix(pc, "#5A2A4A", pc === "#FFFFFF" ? 0.14 : 0.28);
  const light = mix(pc, "#FFFFFF", 0.45);
  const middle = (r: number, fill = cc) => dot(20, 12, r, fill);
  switch (KINDS[v.kind]) {
    case "blossom":
      return {
        petals: ring(5, 'circle cx="20" cy="7.6" r="4.4"', pc),
        center: middle(2.7),
      };
    case "daisy":
      return {
        petals: ring(12, 'ellipse cx="20" cy="7" rx="1.9" ry="4.6"', pc),
        center: middle(3.1),
      };
    case "star":
      return {
        petals: ring(
          6,
          'path d="M20 12C17.2 9.5 17.6 4.5 20 2.2C22.4 4.5 22.8 9.5 20 12Z"',
          pc,
        ),
        center: middle(2.3),
      };
    case "tulip":
      return {
        petals:
          '<path d="M13.4 5.6C12.8 13 15 18.6 20 18.6C25 18.6 27.2 13 26.6 5.6C24.6 6.8 23.1 8.4 22.5 10C22 7.4 21 5 20 3.4C19 5 18 7.4 17.5 10C16.9 8.4 15.4 6.8 13.4 5.6Z" fill="' +
          dark +
          '"/>' +
          '<path d="M20 18.6C16.4 16 16.4 10.8 20 7.2C23.6 10.8 23.6 16 20 18.6Z" fill="' +
          pc +
          '"/>',
        center: "",
      };
    case "sunflower":
      return {
        petals:
          ring(
            12,
            'path d="M20 12C18.2 9 18.5 4 20 1.6C21.5 4 21.8 9 20 12Z"',
            dark,
            15,
          ) +
          ring(
            12,
            'path d="M20 12C18 9 18.4 4.4 20 2C21.6 4.4 22 9 20 12Z"',
            pc,
          ),
        center:
          middle(4.3, "#6B3A14") +
          ring(8, 'circle cx="20" cy="9.6" r=".55"', "#C98A3C") +
          middle(1.1, "#C98A3C"),
      };
    case "rose":
      return {
        petals:
          ring(5, 'circle cx="20" cy="7.2" r="4.7"', dark) +
          ring(5, 'circle cx="20" cy="9" r="3.9"', pc, 36) +
          middle(3.1, light) +
          '<path d="M18.5 12.6C18.3 10.6 21.4 10.2 21.6 12.2C21.8 14.4 17.8 14.6 17.7 11.6" fill="none" stroke="' +
          dark +
          '" stroke-width=".7" stroke-linecap="round"/>',
        center: "",
      };
    case "poppy":
      return {
        petals:
          ring(4, 'ellipse cx="20" cy="7.3" rx="5.7" ry="5.2"', pc, 45) +
          ring(
            4,
            'ellipse cx="20" cy="9.4" rx="1.7" ry="1.5" opacity=".7"' + PLAIN,
            DARK,
            45,
          ),
        center:
          middle(2.3, DARK) + ring(6, 'circle cx="20" cy="10.7" r=".5"', cc),
      };
    case "hyacinth": {
      let petals = dot(20, 2.6, 1.9, light);
      for (let i = 0; i < 8; i++) {
        const x = i % 2 ? 21.9 : 18.1;
        petals += dot(x, +(4.2 + i * 2.1).toFixed(1), 2.3, i % 3 ? pc : dark);
      }
      for (let i = 0; i < 7; i++) {
        petals += dot(20, +(5.3 + i * 2.1).toFixed(1), 0.6, cc, PLAIN);
      }
      return { petals, center: "" };
    }
    case "cosmos":
      return {
        petals: ring(
          8,
          'path d="M20 12L17.5 4.4Q18.1 2.7 19.2 3.5L20 2.7L20.8 3.5Q21.9 2.7 22.5 4.4Z"',
          pc,
        ),
        center: middle(2.5),
      };
    case "pansy": {
      const blotch = mix(pc, "#2B1440", 0.62);
      return {
        petals:
          dot(16.5, 7.6, 4.7, dark) +
          dot(23.5, 7.6, 4.7, dark) +
          dot(14.7, 13.2, 4.4, pc) +
          dot(25.3, 13.2, 4.4, pc) +
          dot(20, 16.2, 4.9, light) +
          '<path d="M20 12L15.8 13.6M20 12L24.2 13.6M20 12L18.4 16.4M20 12V17M20 12L21.6 16.4" stroke="' +
          blotch +
          '" stroke-width=".9" stroke-linecap="round" fill="none"/>',
        center: middle(1.6),
      };
    }
    case "dahlia":
      return {
        petals:
          ring(16, 'ellipse cx="20" cy="6.6" rx="1.3" ry="4.9"', dark) +
          ring(12, 'ellipse cx="20" cy="8" rx="1.3" ry="3.6"', pc, 15) +
          ring(8, 'ellipse cx="20" cy="9.4" rx="1.2" ry="2.3"', light),
        center: middle(1.7),
      };
    case "heart":
      return {
        petals: ring(
          5,
          'path d="M20 12C16.2 9.2 14.6 6.4 15.9 4.2C16.9 2.5 19.4 2.7 20 4.8C20.6 2.7 23.1 2.5 24.1 4.2C25.4 6.4 23.8 9.2 20 12Z"',
          pc,
        ),
        center: middle(2),
      };
  }
}

const LEAF_SHAPES = [
  '<path class="leaf l" d="M20 31C15 31 12 27 11.5 24.5C16 24 19 27 20 31Z"/>' +
    '<path class="leaf r" d="M20 26C25 26 28 22 28.5 19.5C24 19 21 22 20 26Z"/>',
  '<path class="leaf l low" d="M20 39.5C15.6 35 14 28 15 20.5C18.4 26 20 32.5 20 39.5Z"/>' +
    '<path class="leaf r low" d="M20 39.5C24 36 25.6 30.5 25 24.5C22 29 20.4 34 20 39.5Z"/>',
  '<path class="leaf l" d="M20 31C16.8 33 12.6 31.6 11.4 27.6C15.2 25.4 19 27.4 20 31Z"/>' +
    '<path class="leaf r" d="M20 26C23.2 28 27.4 26.6 28.6 22.6C24.8 20.4 21 22.4 20 26Z"/>' +
    '<path class="leaf l" d="M20 22C17.6 22.4 15.6 21 15.2 18.6C17.8 18 19.6 19.6 20 22Z"/>',
];

export function flowerSVG(v: Variety): string {
  const pc = COLORS[v.color][0],
    d = -(Math.random() * 4).toFixed(2),
    { petals, center } = head(v);
  return (
    '<svg class="fl" viewBox="6 0 28 44" aria-hidden="true" style="--d:' +
    d +
    's">' +
    '<ellipse class="mound" cx="20" cy="40.5" rx="11" ry="3"/>' +
    '<ellipse class="seed" cx="20" cy="38.6" rx="2.4" ry="1.6"/>' +
    '<g class="sway"><g class="wiltg"><g class="grow">' +
    '<path class="stem" d="M20 40C18.8 32 21.2 24 20 13"/>' +
    LEAF_SHAPES[v.leaf] +
    '<g class="head">' +
    '<ellipse class="bud" cx="20" cy="12" rx="3.2" ry="4.3" fill="' +
    pc +
    '" stroke="rgba(0,0,0,.15)" stroke-width=".4"/>' +
    '<g class="petals" stroke="rgba(0,0,0,.12)" stroke-width=".35">' +
    petals +
    "</g>" +
    '<g class="center">' +
    center +
    "</g>" +
    "</g>" +
    "</g></g></g></svg>"
  );
}

export function treeSVG(row: number): string {
  const fc = rowColor(row);
  const fruits = [
    [12, 20],
    [27, 16],
    [19, 10],
    [31, 27],
    [9, 30],
    [21, 25],
  ];
  return (
    '<svg viewBox="0 0 40 62" aria-hidden="true">' +
    '<ellipse cx="20" cy="59" rx="13" ry="2.6" fill="var(--soil)" opacity=".3"/>' +
    '<path d="M17 59L18 34H22L23 59Z" fill="#8A5A35"/>' +
    '<circle cx="20" cy="22" r="14" fill="#3E8F45"/><circle cx="10" cy="28" r="8.5" fill="#3E8F45"/><circle cx="30" cy="28" r="8.5" fill="#3E8F45"/>' +
    '<circle cx="20" cy="12" r="10" fill="#4FA653"/><circle cx="14" cy="17" r="7" fill="#5BB55E" opacity=".8"/>' +
    fruits
      .map(
        ([x, y]) =>
          '<circle cx="' +
          x +
          '" cy="' +
          y +
          '" r="2.7" fill="' +
          fc +
          '" stroke="rgba(0,0,0,.18)" stroke-width=".5"/>',
      )
      .join("") +
    "</svg>"
  );
}
