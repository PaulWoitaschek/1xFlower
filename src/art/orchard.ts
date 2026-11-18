import { lilyColor } from "./pond";

// The fruit and the blossom of a tree.
export const FRUIT_COLORS: [fruit: string, blossom: string][] = [
  ["#E5484D", "#FBC4D4"],
  ["#F29A2E", "#FFE0C2"],
  ["#E8C93A", "#FFF3C4"],
  ["#8E5BD1", "#E2D2F7"],
];

// Each word has a fruit of its own, always the same one.
export const fruitColor = (key: string) => lilyColor(key) % FRUIT_COLORS.length;

// Where the fruits and the blossoms hang in the crown.
const SPOTS: [number, number][] = [
  [16, 14],
  [23.5, 13],
  [20, 19.5],
  [12.5, 21],
  [27.5, 21],
  [17, 24],
  [24, 25],
];

const dots = (r: number, fill: string, spots = SPOTS) =>
  spots
    .map(
      ([x, y]) =>
        '<circle cx="' +
        x +
        '" cy="' +
        y +
        '" r="' +
        r +
        '" fill="' +
        fill +
        '"/>',
    )
    .join("");

/* one fruit tree; the stage class of a parent shows the seedling, the small tree, the blossom or the fruit */
export function treeSVG(key: string): string {
  const [fruit, blossom] = FRUIT_COLORS[fruitColor(key)];
  const d = -(Math.random() * 4).toFixed(2);
  return (
    '<svg class="fl tree" viewBox="6 0 28 44" aria-hidden="true" style="--d:' +
    d +
    's">' +
    '<ellipse class="ground" cx="20" cy="40" rx="12.5" ry="3.4"/>' +
    '<g class="sprout"><path class="shoot" d="M20 40V32"/>' +
    '<ellipse class="leaf" cx="16.4" cy="31.5" rx="3.6" ry="2" transform="rotate(-28 16.4 31.5)"/>' +
    '<ellipse class="leaf" cx="23.6" cy="30.5" rx="3.6" ry="2" transform="rotate(28 23.6 30.5)"/></g>' +
    '<g class="grow"><g class="sway">' +
    '<path class="trunk" d="M18.4 40C19 34 18.8 30 18.2 25H21.8C21.2 30 21 34 21.6 40Z"/>' +
    '<g class="crown" stroke="rgba(0,0,0,.14)" stroke-width=".35">' +
    '<circle cx="12.8" cy="22" r="6.4"/><circle cx="27.2" cy="22" r="6.4"/>' +
    '<circle cx="20" cy="16.5" r="9"/><circle cx="20" cy="24" r="6.6"/></g>' +
    '<g class="blossom">' +
    dots(1.5, blossom) +
    "</g>" +
    '<g class="fruits" stroke="rgba(0,0,0,.18)" stroke-width=".3">' +
    dots(2.1, fruit) +
    "</g></g></g></svg>"
  );
}
