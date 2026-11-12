import type { Critter, CritterKind } from "../rules/garden";

export const CRITTER_NAMES: Record<CritterKind, string> = {
  bfly: "Ein Schmetterling",
  bee: "Eine Biene",
  bug: "Ein Marienkäfer",
};

export function critterSVG(c: Pick<Critter, "kind" | "color">): string {
  const d = ' style="--d:-' + (Math.random() * 3).toFixed(2) + 's"';
  if (c.kind === "bee")
    return (
      '<svg class="cr bee" viewBox="0 0 20 20" aria-hidden="true">' +
      '<g class="wl"><ellipse cx="8" cy="5.6" rx="2.6" ry="3.6" fill="#fff" opacity=".9" stroke="#9CC9E6" stroke-width=".4"/></g>' +
      '<g class="wr"><ellipse cx="12" cy="5.6" rx="2.6" ry="3.6" fill="#fff" opacity=".9" stroke="#9CC9E6" stroke-width=".4"/></g>' +
      '<path d="M3.4 11.6H1.8" stroke="#2A2016" stroke-width=".9" stroke-linecap="round"/>' +
      '<ellipse cx="9.4" cy="11.6" rx="6" ry="4.4" fill="#F4B323" stroke="#2A2016" stroke-width=".5"/>' +
      '<path d="M7 7.6V15.6M10.4 7.3V15.9" stroke="#2A2016" stroke-width="1.5"/>' +
      '<circle cx="15.6" cy="11" r="2.6" fill="#2A2016"/><circle cx="16.5" cy="10.4" r=".6" fill="#fff"/></svg>'
    );
  if (c.kind === "bug")
    return (
      '<svg class="cr bug" viewBox="0 0 20 20" aria-hidden="true">' +
      '<circle cx="10" cy="5.8" r="2.8" fill="#2A2016"/>' +
      '<circle cx="10" cy="11.8" r="5.6" fill="#E2403A" stroke="#2A2016" stroke-width=".5"/>' +
      '<path d="M10 6.4V17.4" stroke="#2A2016" stroke-width=".7"/>' +
      '<circle cx="7.4" cy="9.8" r="1.1" fill="#2A2016"/><circle cx="12.6" cy="9.8" r="1.1" fill="#2A2016"/>' +
      '<circle cx="7.2" cy="13.8" r="1" fill="#2A2016"/><circle cx="12.8" cy="13.8" r="1" fill="#2A2016"/>' +
      '<circle cx="9" cy="5" r=".6" fill="#fff"/><circle cx="11" cy="5" r=".6" fill="#fff"/></svg>'
    );
  const w = 'fill="' + c.color + '" stroke="rgba(0,0,0,.18)" stroke-width=".4"';
  return (
    '<svg class="cr bfly" viewBox="0 0 20 20" aria-hidden="true"' +
    d +
    ">" +
    '<g class="wl"><ellipse cx="5.6" cy="7" rx="4.6" ry="4.2" ' +
    w +
    '/><ellipse cx="6.4" cy="13.4" rx="3.2" ry="2.8" ' +
    w +
    '/><circle cx="5" cy="6.5" r="1.4" fill="#fff" opacity=".7"/></g>' +
    '<g class="wr"><ellipse cx="14.4" cy="7" rx="4.6" ry="4.2" ' +
    w +
    '/><ellipse cx="13.6" cy="13.4" rx="3.2" ry="2.8" ' +
    w +
    '/><circle cx="15" cy="6.5" r="1.4" fill="#fff" opacity=".7"/></g>' +
    '<ellipse cx="10" cy="10.5" rx="1.1" ry="4.6" fill="#3A2A20"/>' +
    '<path d="M9.6 6.2Q8.6 3.6 7.4 3M10.4 6.2Q11.4 3.6 12.6 3" stroke="#3A2A20" stroke-width=".6" fill="none" stroke-linecap="round"/></svg>'
  );
}
