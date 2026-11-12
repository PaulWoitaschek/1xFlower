export interface Deco {
  id: string;
  name: string;
  /** blooms that bring this gift */
  at: number;
  /** height in the yard, in px */
  h: number;
  /** place in the yard, from left to right */
  pos?: number;
  fence?: boolean;
  svg: string;
}

const svg = (vb: string, body: string) =>
  '<svg viewBox="' + vb + '" aria-hidden="true">' + body + "</svg>";
export const DECO: Deco[] = [
  {
    id: "kanne",
    name: "Gießkanne",
    at: 3,
    h: 40,
    pos: 2,
    svg: svg(
      "0 0 42 30",
      '<path d="M11 10Q17 -1 25 10" fill="none" stroke="#2F7FB8" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M27 21L37 10" stroke="#4FA8E6" stroke-width="3.4" stroke-linecap="round"/>' +
        '<ellipse cx="38.2" cy="8.8" rx="3" ry="2" transform="rotate(-45 38.2 8.8)" fill="#2F7FB8"/>' +
        '<rect x="7" y="10" width="22" height="18" rx="4" fill="#4FA8E6"/><rect x="7" y="14" width="22" height="3" fill="#2F7FB8" opacity=".5"/>',
    ),
  },
  {
    id: "pilze",
    name: "Pilze",
    at: 10,
    h: 38,
    pos: 5,
    svg: svg(
      "0 0 36 30",
      '<rect x="8.5" y="15" width="6" height="14" rx="2.5" fill="#F3E6D0"/><path d="M2 17Q11.5 0 21 17Z" fill="#D9465F"/>' +
        '<circle cx="8" cy="11" r="1.6" fill="#fff"/><circle cx="14.5" cy="8.5" r="1.3" fill="#fff"/><circle cx="16" cy="13.5" r="1.2" fill="#fff"/>' +
        '<rect x="25" y="20" width="4.5" height="9" rx="2" fill="#F3E6D0"/><path d="M20 21.5Q27.2 9 34.5 21.5Z" fill="#E8783C"/>' +
        '<circle cx="25" cy="17.5" r="1" fill="#fff"/><circle cx="29.5" cy="16.5" r="1.1" fill="#fff"/>',
    ),
  },
  {
    id: "zaun",
    name: "Gartenzaun",
    at: 20,
    h: 30,
    fence: true,
    svg: svg(
      "0 0 48 30",
      '<rect y="12" width="48" height="3" fill="#C9A26E"/><rect y="22" width="48" height="3" fill="#C9A26E"/>' +
        [4, 20, 36]
          .map(
            (x) =>
              '<path d="M' +
              x +
              " 30V9L" +
              (x + 3) +
              " 5L" +
              (x + 6) +
              ' 9V30Z" fill="#E6CFA3" stroke="#B89466" stroke-width=".6"/>',
          )
          .join(""),
    ),
  },
  {
    id: "zwerg",
    name: "Gartenzwerg",
    at: 32,
    h: 58,
    pos: 3,
    svg: svg(
      "0 0 28 46",
      '<path d="M5 41Q14 22 23 41Z" fill="#3E7BD9"/>' +
        '<ellipse cx="9.5" cy="42.5" rx="4" ry="2.3" fill="#5A3A22"/><ellipse cx="18.5" cy="42.5" rx="4" ry="2.3" fill="#5A3A22"/>' +
        '<circle cx="14" cy="21.5" r="5.5" fill="#F6C9A8"/>' +
        '<path d="M8.5 23Q14 39 19.5 23Q14 27 8.5 23Z" fill="#FFFFFF" stroke="#D8D8D8" stroke-width=".4"/>' +
        '<circle cx="14" cy="23.6" r="1.7" fill="#E89A7A"/><circle cx="11.8" cy="21" r=".8" fill="#2A2016"/><circle cx="16.2" cy="21" r=".8" fill="#2A2016"/>' +
        '<path d="M14 1L23.5 18.5H4.5Z" fill="#D9465F"/><rect x="4" y="17" width="20" height="2.6" rx="1.3" fill="#B83A50"/>',
    ),
  },
  {
    id: "igel",
    name: "Igel",
    at: 46,
    h: 34,
    pos: 6,
    svg: svg(
      "0 0 42 28",
      '<path d="M4 25L3 17L7 19L7 11L11 15L13 7L16 12L19 5L21 11L24 5L26 11L29 7L30 14L33 12L33 25Z" fill="#6B4E33"/>' +
        '<path d="M5 25Q6 12 19 10Q31 10 34 25Z" fill="#8A6A48"/>' +
        '<path d="M28 25Q28 15 35 15Q40 16 41 21Q40 25 34 25Z" fill="#E8C9A0"/>' +
        '<circle cx="40.6" cy="20.6" r="1.4" fill="#2A2016"/><circle cx="34.6" cy="18.6" r="1" fill="#2A2016"/>' +
        '<ellipse cx="12" cy="26" rx="2.5" ry="1.4" fill="#5A3A22"/><ellipse cx="29" cy="26" rx="2.5" ry="1.4" fill="#5A3A22"/>',
    ),
  },
  {
    id: "haus",
    name: "Vogelhäuschen",
    at: 62,
    h: 72,
    pos: 1,
    svg: svg(
      "0 0 30 56",
      '<rect x="13.5" y="27" width="3" height="29" fill="#8A6A48"/><rect x="6" y="13" width="18" height="16" rx="1.5" fill="#E8A85C"/>' +
        '<circle cx="15" cy="20" r="3.2" fill="#3A2A20"/><rect x="13" y="25" width="4" height="1.4" rx=".7" fill="#8A6A48"/>' +
        '<path d="M2.5 15L15 3L27.5 15Z" fill="#B5523B" stroke="#8E3E2C" stroke-width=".6" stroke-linejoin="round"/>' +
        '<circle cx="22" cy="8" r="2.6" fill="#4FA8E6"/><path d="M24.4 7.4L26.8 8.1L24.4 8.9Z" fill="#F4B323"/><circle cx="22.9" cy="7.3" r=".5" fill="#2A2016"/>',
    ),
  },
  {
    id: "teich",
    name: "Teich",
    at: 80,
    h: 32,
    pos: 4,
    svg: svg(
      "0 0 84 26",
      '<path d="M6 19Q5 7 3 2M9 19Q9 8 11 3M12 19Q13 10 16 7" stroke="#4A9A3C" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="11" cy="5.5" rx="1.2" ry="3" fill="#7A4E2C"/>' +
        '<ellipse cx="44" cy="17" rx="38" ry="8.5" fill="#3A86C0"/><ellipse cx="44" cy="16" rx="35" ry="7" fill="#5DB2EA"/>' +
        '<ellipse cx="34" cy="14" rx="12" ry="2" fill="#fff" opacity=".35"/>' +
        '<ellipse cx="62" cy="16.5" rx="6" ry="3" fill="#3E9B4F"/><path d="M62 16.5L68 15.6L67.6 17.6Z" fill="#5DB2EA"/>' +
        '<circle cx="60.6" cy="15.4" r="1.8" fill="#FF8FA3"/>',
    ),
  },
];
export const FENCE =
  '<svg class="fence" aria-hidden="true"><defs><pattern id="fencePat" width="16" height="30" patternUnits="userSpaceOnUse">' +
  '<path d="M5 30V9L8 5L11 9V30Z" fill="#E6CFA3" stroke="#B89466" stroke-width=".6"/></pattern></defs>' +
  '<rect y="12" width="100%" height="3" fill="#C9A26E"/><rect y="22" width="100%" height="3" fill="#C9A26E"/>' +
  '<rect width="100%" height="30" fill="url(#fencePat)"/></svg>';
export const sized = (d: Deco, h: number) =>
  d.svg.replace("<svg", '<svg style="height:' + h + 'px"');
