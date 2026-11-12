/* every row has its own flower: petal color, center color, shape */
export const FLOWERS: [petal: string, center: string][] = [
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
];
// the white flower shows its center color where white is hard to see
export function flowerColor(row: number): string {
  const [pc, cc] = FLOWERS[row - 1];
  return pc === "#FFFFFF" ? cc : pc;
}
function petals(row: number): string {
  const [pc] = FLOWERS[row - 1],
    shape = (row - 1) % 3;
  let s = "";
  if (shape === 1) {
    for (let i = 0; i < 12; i++)
      s +=
        '<ellipse cx="20" cy="7" rx="1.9" ry="4.6" fill="' +
        pc +
        '" transform="rotate(' +
        i * 30 +
        ' 20 12)"/>';
  } else if (shape === 0) {
    for (let i = 0; i < 5; i++)
      s +=
        '<circle cx="20" cy="7.6" r="4.4" fill="' +
        pc +
        '" transform="rotate(' +
        i * 72 +
        ' 20 12)"/>';
  } else {
    for (let i = 0; i < 6; i++)
      s +=
        '<path d="M20 12C17.2 9.5 17.6 4.5 20 2.2C22.4 4.5 22.8 9.5 20 12Z" fill="' +
        pc +
        '" transform="rotate(' +
        i * 60 +
        ' 20 12)"/>';
  }
  return s;
}
export function flowerSVG(row: number): string {
  const [pc, cc] = FLOWERS[row - 1],
    d = -(Math.random() * 4).toFixed(2),
    cr = [2.7, 3.1, 2.3][(row - 1) % 3];
  return (
    '<svg class="fl" viewBox="6 0 28 44" aria-hidden="true" style="--d:' +
    d +
    's">' +
    '<ellipse class="mound" cx="20" cy="40.5" rx="11" ry="3"/>' +
    '<ellipse class="seed" cx="20" cy="38.6" rx="2.4" ry="1.6"/>' +
    '<g class="sway"><g class="wiltg"><g class="grow">' +
    '<path class="stem" d="M20 40C18.8 32 21.2 24 20 13"/>' +
    '<path class="leaf l" d="M20 31C15 31 12 27 11.5 24.5C16 24 19 27 20 31Z"/>' +
    '<path class="leaf r" d="M20 26C25 26 28 22 28.5 19.5C24 19 21 22 20 26Z"/>' +
    '<g class="head">' +
    '<ellipse class="bud" cx="20" cy="12" rx="3.2" ry="4.3" fill="' +
    pc +
    '" stroke="rgba(0,0,0,.15)" stroke-width=".4"/>' +
    '<g class="petals">' +
    petals(row) +
    "</g>" +
    '<circle class="center" cx="20" cy="12" r="' +
    cr +
    '" fill="' +
    cc +
    '"/>' +
    "</g>" +
    "</g></g></g></svg>"
  );
}

export function treeSVG(row: number): string {
  const fc = flowerColor(row);
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
