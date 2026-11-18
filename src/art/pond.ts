// The petals and the inner petals of a water lily.
export const LILY_COLORS: [petal: string, inner: string][] = [
  ["#F7A8C8", "#FDE3EE"],
  ["#FFFFFF", "#FFF1BF"],
  ["#FFD86B", "#FFF1B8"],
  ["#C9A8F5", "#EBDDFE"],
];

// Each word has a color of its own, always the same one.
export function lilyColor(key: string): number {
  let sum = 0;
  for (const ch of key) sum = (sum * 31 + ch.codePointAt(0)!) % 9973;
  return sum % LILY_COLORS.length;
}

const petals = (
  angles: number[],
  cy: number,
  rx: number,
  ry: number,
  fill: string,
) =>
  angles
    .map(
      (a) =>
        '<ellipse cx="20" cy="' +
        cy +
        '" rx="' +
        rx +
        '" ry="' +
        ry +
        '" fill="' +
        fill +
        '" transform="rotate(' +
        a +
        ' 20 35.5)"/>',
    )
    .join("");

/* one water lily; the stage class of a parent shows the leaf, the bud or the open bloom */
export function lilySVG(key: string): string {
  const [petal, inner] = LILY_COLORS[lilyColor(key)];
  const d = -(Math.random() * 4).toFixed(2);
  return (
    '<svg class="fl lily" viewBox="6 0 28 44" aria-hidden="true" style="--d:' +
    d +
    's">' +
    '<ellipse class="water" cx="20" cy="38.5" rx="13.5" ry="4.8"/>' +
    '<g class="lpad"><ellipse cx="20" cy="38" rx="10.5" ry="3.6"/>' +
    '<path class="notch" d="M20 38L31.5 36V40Z"/></g>' +
    '<g class="sway">' +
    '<g class="lbud"><path d="M20 23.5C24 28 24 34 20 37.5C16 34 16 28 20 23.5Z" fill="' +
    petal +
    '" stroke="rgba(0,0,0,.14)" stroke-width=".35"/><path class="sepal" d="M20 30.5C23 32.5 23 36 20 37.5C17 36 17 32.5 20 30.5Z"/></g>' +
    '<g class="lbloom" stroke="rgba(0,0,0,.14)" stroke-width=".35">' +
    petals([-80, -54, -27, 0, 27, 54, 80], 27.5, 2.8, 7.8, petal) +
    petals([-46, -23, 0, 23, 46], 30, 2.3, 5.6, inner) +
    '<ellipse cx="20" cy="34.4" rx="3.2" ry="1.9" fill="#F4B323"/>' +
    "</g></g></svg>"
  );
}

/* the frog that hops over the syllables */
export function frogSVG(): string {
  return (
    '<svg viewBox="0 0 40 32" aria-hidden="true">' +
    '<ellipse cx="20" cy="30" rx="13" ry="1.8" fill="rgba(0,0,0,.12)"/>' +
    '<path d="M6 27Q3 20 9 19L13 24ZM34 27Q37 20 31 19L27 24Z" fill="#4E9E3F"/>' +
    '<ellipse cx="20" cy="20.5" rx="12" ry="9" fill="#6DBE4B"/>' +
    '<ellipse cx="20" cy="23.5" rx="7.5" ry="5" fill="#CBEBA6"/>' +
    '<circle cx="13" cy="10.5" r="4.6" fill="#6DBE4B"/><circle cx="27" cy="10.5" r="4.6" fill="#6DBE4B"/>' +
    '<circle cx="13" cy="10.3" r="2.9" fill="#fff"/><circle cx="27" cy="10.3" r="2.9" fill="#fff"/>' +
    '<circle cx="13.6" cy="10.6" r="1.5" fill="#1E2A1B"/><circle cx="26.4" cy="10.6" r="1.5" fill="#1E2A1B"/>' +
    '<path d="M14 18.5Q20 22.5 26 18.5" fill="none" stroke="#2F6B2A" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M9 28.5h6M25 28.5h6" stroke="#4E9E3F" stroke-width="2.4" stroke-linecap="round"/>' +
    "</svg>"
  );
}
