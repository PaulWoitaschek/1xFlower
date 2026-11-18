import { eggStage, type Chicken, type Egg } from "../rules/farm";

const HAY = "#E9C46A";
const HAY_INK = "#B98A2E";

// The blades of a patch: [x, lean, height] from the ground at y 40.
const BLADES: [x: number, lean: number, h: number][] = [
  [13, -4, 22],
  [15.5, -2, 28],
  [18, -1, 32],
  [20, 0.5, 26],
  [22, 1.5, 33],
  [24.5, 3, 27],
  [27, 4.5, 21],
];

function blade([x, lean, h]: [number, number, number]) {
  const top = 40 - h;
  const mid = 40 - h * 0.55;
  return (
    '<path class="blade" d="M' +
    (x - 1.4) +
    " 40Q" +
    (x + lean * 0.3) +
    " " +
    mid +
    " " +
    (x + lean) +
    " " +
    top +
    "Q" +
    (x + lean * 0.3 + 0.9) +
    " " +
    mid +
    " " +
    (x + 1.4) +
    ' 40Z"/>'
  );
}

/* one patch of the meadow; the stage class of a parent shows the grass, the high grass or the hay bale */
export function grassSVG(): string {
  const d = -(Math.random() * 4).toFixed(2);
  const heads = BLADES.filter((_, i) => i % 2 === 0)
    .map(
      ([x, lean, h]) =>
        '<ellipse cx="' +
        (x + lean) +
        '" cy="' +
        (41 - h) +
        '" rx="1.3" ry="2.6" transform="rotate(' +
        lean * 4 +
        " " +
        (x + lean) +
        " " +
        (41 - h) +
        ')"/>',
    )
    .join("");
  return (
    '<svg class="fl gr" viewBox="6 0 28 44" aria-hidden="true" style="--d:' +
    d +
    's">' +
    '<ellipse class="mound" cx="20" cy="40.5" rx="11" ry="3"/>' +
    '<ellipse class="seed" cx="16" cy="39" rx="1.2" ry=".8"/><ellipse class="seed" cx="23" cy="39.2" rx="1.2" ry=".8"/>' +
    '<g class="sway"><g class="grass">' +
    BLADES.map(blade).join("") +
    '<g class="heads">' +
    heads +
    "</g></g></g>" +
    '<g class="bale">' +
    '<ellipse cx="20" cy="40" rx="10" ry="1.6" fill="rgba(0,0,0,.14)"/>' +
    '<rect x="9.5" y="25" width="21" height="15" rx="7.5" fill="' +
    HAY +
    '" stroke="' +
    HAY_INK +
    '" stroke-width=".6"/>' +
    '<circle cx="17" cy="32.5" r="6.6" fill="#F2D488" stroke="' +
    HAY_INK +
    '" stroke-width=".6"/>' +
    '<path d="M17 32.5m-4.4 0a4.4 4.4 0 1 1 8.8 0a3 3 0 1 1 -6 0a1.6 1.6 0 1 1 3.2 0" fill="none" stroke="' +
    HAY_INK +
    '" stroke-width=".6"/>' +
    '<path d="M25 27.5l2 2.5M26.5 31l1.6 2M24.8 35l2.2 1.6" stroke="' +
    HAY_INK +
    '" stroke-width=".5" stroke-linecap="round"/>' +
    "</g></svg>"
  );
}

/* a big haystack for a row in which every patch is hay */
export function haystackSVG(): string {
  return (
    '<svg viewBox="0 0 40 62" aria-hidden="true">' +
    '<ellipse cx="20" cy="59" rx="15" ry="2.6" fill="var(--soil)" opacity=".3"/>' +
    '<path d="M3 59C3 34 9 18 20 15C31 18 37 34 37 59Z" fill="' +
    HAY +
    '" stroke="' +
    HAY_INK +
    '" stroke-width=".8"/>' +
    '<path d="M9 52Q14 40 12 30M17 56Q20 40 18 24M24 55Q26 42 25 26M31 52Q30 42 28 33" fill="none" stroke="' +
    HAY_INK +
    '" stroke-width=".7" stroke-linecap="round"/>' +
    '<path d="M18 15L21 6M22 15L26 8" stroke="' +
    HAY_INK +
    '" stroke-width=".9" stroke-linecap="round"/>' +
    "</svg>"
  );
}

/* a small hay bale for counts and buttons */
export function baleSVG(): string {
  return (
    '<svg class="balei" viewBox="0 0 24 18" aria-hidden="true">' +
    '<rect x="1" y="2" width="22" height="15" rx="7" fill="' +
    HAY +
    '" stroke="' +
    HAY_INK +
    '" stroke-width=".8"/>' +
    '<circle cx="8.5" cy="9.5" r="6" fill="#F2D488" stroke="' +
    HAY_INK +
    '" stroke-width=".8"/>' +
    '<path d="M8.5 9.5m-3.8 0a3.8 3.8 0 1 1 7.6 0a2.4 2.4 0 1 1 -4.8 0" fill="none" stroke="' +
    HAY_INK +
    '" stroke-width=".7"/></svg>'
  );
}

export function barnSVG(hay: number): string {
  const loft = hay
    ? '<path d="M27 21Q29 15 32 17Q35 14 37 21Z" fill="' + HAY + '"/>'
    : "";
  return (
    '<svg class="barn" viewBox="0 0 64 56" aria-hidden="true">' +
    '<path d="M1 25L32 3L63 25Z" fill="#8E2F2A"/>' +
    '<rect x="6" y="22" width="52" height="33" fill="#C8443B"/>' +
    '<path d="M6 22H58" stroke="#fff" stroke-width="1.6"/>' +
    '<rect x="26" y="12" width="12" height="9" fill="#5A2A1A" stroke="#fff" stroke-width="1.2"/>' +
    loft +
    '<rect x="21" y="33" width="22" height="22" fill="#9E3530" stroke="#fff" stroke-width="1.6"/>' +
    '<path d="M21 33L43 55M43 33L21 55" stroke="#fff" stroke-width="1.4"/>' +
    "</svg>"
  );
}

function eggSVG(egg: Egg, x: number, first: boolean): string {
  const st = eggStage(egg);
  const crack =
    st >= 2
      ? '<path d="M' +
        (x - 5.5) +
        " 12l2.4 -2 2 2.4 2.2 -2.6 2.2 2.4 2.4 -2.2" +
        '" fill="none" stroke="#7A5A3A" stroke-width=".7" stroke-linejoin="round"/>'
      : "";
  const peek =
    st >= 3
      ? '<circle cx="' +
        (x + 1.5) +
        '" cy="7.5" r="2.4" fill="#FFE066"/><circle cx="' +
        (x + 2.2) +
        '" cy="7" r=".55" fill="#2A2016"/><path d="M' +
        (x + 3.6) +
        " 7.6l1.4 .5 -1.4 .5" +
        'z" fill="#F4A21B"/>'
      : "";
  return (
    '<g class="egg s' +
    st +
    (first ? " warm" : "") +
    '">' +
    '<ellipse cx="' +
    x +
    '" cy="13" rx="6" ry="8" fill="#FFF4DF" stroke="rgba(0,0,0,.28)" stroke-width=".6"/>' +
    '<circle cx="' +
    (x - 2) +
    '" cy="10" r=".7" fill="#D9B98A"/><circle cx="' +
    (x + 2.4) +
    '" cy="15" r=".8" fill="#D9B98A"/>' +
    crack +
    peek +
    "</g>"
  );
}

/* the nest with up to three eggs; the first egg is warmed */
export function nestSVG(eggs: Egg[]): string {
  const xs = [16, 30, 44];
  return (
    '<svg class="nestsvg" viewBox="0 0 60 30" aria-hidden="true">' +
    '<path d="M5 19Q30 13 55 19Q55 21 30 21Q5 21 5 19Z" fill="#7A5230"/>' +
    eggs
      .slice(0, 3)
      .map((egg, i) => eggSVG(egg, xs[i], i === 0))
      .join("") +
    '<path d="M3 18Q30 36 57 18Q57 27 30 29Q3 27 3 18Z" fill="#A0703C"/>' +
    '<path d="M8 21Q20 27 30 26M22 25Q36 28 50 21M12 24Q26 30 44 26" fill="none" stroke="#7A5230" stroke-width=".9" stroke-linecap="round"/>' +
    "</svg>"
  );
}

// Hens and their chicks in five colors.
export const HENS = ["#FFFDF5", "#B5652B", "#E7A93B", "#3B3B45", "#A9A9B8"];
export const CHICKS = ["#FFE97A", "#E8AD6E", "#FFD25E", "#7A7A86", "#D8D8E2"];
export const HEN_NAMES = [
  "weißes",
  "braunes",
  "goldenes",
  "schwarzes",
  "graues",
];

export function chickenSVG(c: Chicken): string {
  const d = ' style="--d:-' + (Math.random() * 4).toFixed(2) + 's"';
  const ink = 'stroke="rgba(0,0,0,.3)" stroke-width=".5"';
  const legs =
    '<path d="M10 20.5V23.4M13.6 20.5V23.4M8.8 23.4H11M12.4 23.4H14.6" stroke="#E39A1B" stroke-width=".9" stroke-linecap="round"/>';
  if (!c.grown) {
    const fill = 'fill="' + CHICKS[c.color] + '" ' + ink;
    return (
      '<svg class="chick" viewBox="0 0 24 24" aria-hidden="true"' +
      d +
      ">" +
      legs +
      '<g class="peck"><ellipse cx="11.5" cy="16" rx="6.4" ry="5.2" ' +
      fill +
      "/>" +
      '<path d="M8 15.5q3 -1.6 5 1q-2.6 2 -5 -1z" fill="rgba(0,0,0,.12)"/>' +
      '<circle cx="15.5" cy="10.5" r="4.2" ' +
      fill +
      "/>" +
      '<circle cx="16.8" cy="9.8" r=".75" fill="#2A2016"/>' +
      '<path d="M19.4 10.4l2.4 .9 -2.4 .9z" fill="#F4A21B"/></g></svg>'
    );
  }
  const fill = 'fill="' + HENS[c.color] + '" ' + ink;
  return (
    '<svg class="hen" viewBox="0 0 24 24" aria-hidden="true"' +
    d +
    ">" +
    legs +
    '<g class="peck">' +
    '<path d="M5.4 13Q1.4 6.4 4.6 5.6Q4.2 9 6.6 11Z" ' +
    fill +
    "/>" +
    '<ellipse cx="11.6" cy="14.6" rx="7.6" ry="6.2" ' +
    fill +
    "/>" +
    '<path d="M8 13.4q4 -3 7.4 .8q-3.2 3.2 -7.4 -.8z" fill="rgba(0,0,0,.13)"/>' +
    '<path d="M15.2 5.2q.9 -2.2 2 -.3q1.1 -2 2 .1q.6 1.6 -.6 2.2h-3z" fill="#E2403A"/>' +
    '<circle cx="17.4" cy="8.6" r="3.9" ' +
    fill +
    "/>" +
    '<ellipse cx="20.3" cy="11.6" rx=".9" ry="1.4" fill="#E2403A"/>' +
    '<circle cx="18.5" cy="7.9" r=".8" fill="#2A2016"/>' +
    '<path d="M21 8.4l2.4 1 -2.4 1z" fill="#F4A21B"/>' +
    "</g></svg>"
  );
}

/* the basket with the eggs the hens laid while the flock was full */
export function basketSVG(): string {
  return (
    '<svg class="basketsvg" viewBox="0 0 40 30" aria-hidden="true">' +
    '<path d="M8 14Q20 -4 32 14" fill="none" stroke="#A0703C" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse cx="14" cy="13" rx="4.5" ry="6" fill="#FFF4DF" stroke="rgba(0,0,0,.28)" stroke-width=".6"/>' +
    '<ellipse cx="26" cy="13" rx="4.5" ry="6" fill="#F3DCC0" stroke="rgba(0,0,0,.28)" stroke-width=".6"/>' +
    '<ellipse cx="20" cy="11" rx="4.5" ry="6" fill="#FFF4DF" stroke="rgba(0,0,0,.28)" stroke-width=".6"/>' +
    '<path d="M4 15H36L32 28H8Z" fill="#C08A4A"/>' +
    '<path d="M6 19H34M7 23.5H33M14 15V28M20 15V28M26 15V28" stroke="#8A5E30" stroke-width=".9"/>' +
    "</svg>"
  );
}
