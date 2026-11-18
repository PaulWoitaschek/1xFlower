import {
  curve,
  dayStreak,
  doneOf,
  firstDay,
  MODES,
  rowState,
  span,
  STAR_TASKS,
  starsOf,
  tasksOf,
  timeOf,
  rightOf,
  toNextStar,
  totalStars,
  tricky,
  type Day,
} from "../rules/diary";
import { divKey } from "../rules/farm";
import { pondOf, pondWords } from "../rules/pond";
import type { Mode } from "../rules/storage";
import { dayOf, factors, keyOf } from "../rules/garden";
import { $, mk } from "./dom";
import { sfx } from "./sound";
import { activeProfile, garden } from "./state";

// "Meine Sterne": the child sees the stars of each day and what blooms. The
// parents open a part with the activity and the learning over time.

const NAMES: Record<Mode, string> = {
  garden: "Garten",
  farm: "Bauernhof",
  pond: "Teich",
};
const WHAT: Record<Mode, string> = {
  garden: "Blüten",
  farm: "Heu",
  pond: "Seerosen",
};
const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const RANGES = [
  { days: 14, label: "2 Wochen" },
  { days: 28, label: "4 Wochen" },
  { days: 91, label: "3 Monate" },
];

const view = { range: 28, parents: false };

const today = () => dayOf(Date.now());

const dateOf = (day: number) => new Date(day * 86_400_000);
const weekday = (day: number) => WEEKDAYS[dateOf(day).getUTCDay()];
const shortDate = (day: number) => {
  const d = dateOf(day);
  return d.getUTCDate() + "." + (d.getUTCMonth() + 1) + ".";
};
const longDate = (day: number) =>
  day === today()
    ? "Heute"
    : day === today() - 1
      ? "Gestern"
      : weekday(day) + ", " + shortDate(day);

const minutes = (ms: number) => {
  const min = Math.round(ms / 60_000);
  return ms && !min ? "< 1 Min." : min + " Min.";
};
const percent = (right: number, all: number) =>
  all ? Math.round((right / all) * 100) + " %" : "–";
const plural = (n: number, one: string, many: string) =>
  n + " " + (n === 1 ? one : many);

function starRow(stars: number) {
  const el = mk("span", "stars");
  el.setAttribute("aria-label", plural(stars, "Stern", "Sterne"));
  for (let i = 0; i < STAR_TASKS.length; i++)
    el.append(mk("i", i < stars ? "on" : null, "★"));
  return el;
}

/** the number of stars in the header */
export function renderStarCount() {
  $("sStars").textContent = String(totalStars(garden));
}

export function openStars() {
  $("stars").hidden = false;
  renderStars();
  sfx("tap");
}

export function closeStars() {
  $("stars").hidden = true;
}

export const starsOpen = () => !$("stars").hidden;

function renderStars() {
  const p = activeProfile();
  $("starTitle").textContent = p ? "Sterne von " + p.name : "Meine Sterne";
  const body = $("starBody");
  body.innerHTML = "";
  body.append(heroPart(), weekPart(), canPart(), parentPart());
}

// The stars of all days, the days in a row and the way to the next star.
function heroPart() {
  const t = today();
  const all = totalStars(garden);
  const streak = dayStreak(garden, t);
  const need = toNextStar(garden, t);
  const hero = mk("div", "shero");
  const big = mk("div", "sbig");
  big.append(mk("span", "star", "★"), mk("b", null, String(all)));
  hero.append(big);
  hero.append(
    mk("p", "ssub", all === 1 ? "Stern gesammelt" : "Sterne gesammelt"),
  );
  const lines = [];
  if (streak > 1) lines.push(streak + " Tage hintereinander geübt!");
  lines.push(
    need
      ? "Noch " +
          plural(need, "Aufgabe", "Aufgaben") +
          " bis zum " +
          (starsOf(garden.days?.[t]) ? "nächsten" : "ersten") +
          " Stern heute."
      : "Heute hast du alle Sterne. Super!",
  );
  for (const line of lines) hero.append(mk("p", "snext", line));
  return hero;
}

// The last 14 days, each with its stars.
function weekPart() {
  const t = today();
  const part = mk("section", "spart");
  part.append(mk("h3", null, "Deine letzten zwei Wochen"));
  const grid = mk("div", "sdays");
  for (let day = t - 13; day <= t; day++) {
    const entry = garden.days?.[day];
    const cell = mk("div", "sday" + (day === t ? " now" : ""));
    cell.title =
      longDate(day) + ": " + plural(tasksOf(entry), "Aufgabe", "Aufgaben");
    cell.append(
      mk("small", null, weekday(day)),
      mk("span", "sdate", String(dateOf(day).getUTCDate())),
      starRow(starsOf(entry)),
    );
    grid.append(cell);
  }
  part.append(grid);
  part.append(
    mk(
      "p",
      "shint",
      "Für " +
        STAR_TASKS.join(", ").replace(/, (\d+)$/, " und $1") +
        " Aufgaben an einem Tag gibt es je einen Stern.",
    ),
  );
  return part;
}

// What blooms in the garden, on the farm and in the pond.
function canPart() {
  const part = mk("section", "spart");
  part.append(mk("h3", null, "Das kannst du schon"));
  const done = doneOf(garden);
  const totals: Record<Mode, number> = {
    garden: 100,
    farm: 100,
    pond: pondWords(pondOf(garden)).length,
  };
  for (const mode of MODES) {
    const total = Math.max(totals[mode], done[mode]);
    const meter = mk("div", "smeter");
    const label = mk("div", "smlab");
    label.append(
      mk("span", null, NAMES[mode]),
      mk("b", null, done[mode] + " von " + total + " " + WHAT[mode]),
    );
    const bar = mk("div", "sbar");
    const fill = mk("i", "c-" + mode);
    fill.style.width = (total ? (done[mode] / total) * 100 : 0) + "%";
    bar.append(fill);
    meter.append(label, bar);
    part.append(meter);
  }
  return part;
}

// The part for the parents: activity, learning over time, rows and errors.
function parentPart() {
  const part = mk("details", "sparents");
  part.open = view.parents;
  part.ontoggle = () => (view.parents = part.open);
  const summary = mk("summary", null, "Für Eltern");
  part.append(summary);
  const inner = mk("div", "spinner");
  part.append(inner);

  const t = today();
  const first = firstDay(garden);
  if (first === null) {
    inner.append(
      mk(
        "p",
        "shint",
        "Hier erscheint der Verlauf, sobald dein Kind übt. Er beginnt mit dem ersten Tag nach diesem Update.",
      ),
    );
    inner.append(rowsPart(), trickyPart());
    return part;
  }

  inner.append(weekTiles(t));

  const ranges = mk("div", "chips sranges");
  ranges.setAttribute("role", "group");
  ranges.setAttribute("aria-label", "Zeitraum");
  for (const range of RANGES) {
    const chip = mk("button", "chip", range.label);
    chip.setAttribute("aria-pressed", String(view.range === range.days));
    chip.onclick = () => {
      view.range = range.days;
      renderStars();
    };
    ranges.append(chip);
  }
  inner.append(ranges);
  inner.append(activityChart(t, view.range), learnChart(t, view.range));
  if (first > t - view.range)
    inner.append(
      mk("p", "shint", "Der Verlauf beginnt am " + shortDate(first) + "."),
    );
  inner.append(rowsPart(), trickyPart());
  return part;
}

function weekTiles(t: number) {
  const week = span(garden, t, 7);
  const before = span(garden, t - 7, 7);
  const tiles = mk("div", "stiles");
  const tile = (label: string, value: string, was: string) => {
    const el = mk("div", "stile");
    el.append(
      mk("small", null, label),
      mk("b", null, value),
      mk("span", null, "Woche davor: " + was),
    );
    tiles.append(el);
  };
  tile("Übungstage", week.days + " von 7", String(before.days));
  tile("Aufgaben", String(week.tasks), String(before.tasks));
  tile(
    "Gleich richtig",
    percent(week.right, week.tasks),
    percent(before.right, before.tasks),
  );
  tile("Denkzeit", minutes(week.ms), minutes(before.ms));
  const wrap = mk("div");
  wrap.append(mk("h3", null, "Die letzten 7 Tage"), tiles);
  return wrap;
}

function legend() {
  const el = mk("div", "slegend");
  for (const mode of MODES) {
    const item = mk("span");
    item.append(mk("i", "c-" + mode), document.createTextNode(NAMES[mode]));
    el.append(item);
  }
  return el;
}

const W = () => Math.max(260, Math.min(620, $("starBody").clientWidth - 4));
const H = 150;
const PAD = { top: 10, right: 6, bottom: 22, left: 30 };

function niceMax(max: number) {
  if (max <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

const svgEl = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
) => {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

// The frame of a chart over `count` days: the grid, the axes and a hover that
// shows the day in `readout`.
function frame(
  t: number,
  count: number,
  max: number,
  read: (i: number) => string,
) {
  const width = W();
  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${H}`,
    width,
    height: H,
    class: "schart",
    role: "img",
  });
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i + 0.5) * (plotW / count);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  for (const v of [0, max / 2, max]) {
    svg.append(
      svgEl("line", {
        x1: PAD.left,
        x2: width - PAD.right,
        y1: y(v),
        y2: y(v),
        class: v ? "grid" : "base",
      }),
    );
    const label = svgEl("text", {
      x: PAD.left - 6,
      y: y(v) + 4,
      "text-anchor": "end",
    });
    label.textContent = String(Math.round(v));
    svg.append(label);
  }
  // a date under the first, the middle and the last day
  for (const i of [0, Math.floor((count - 1) / 2), count - 1]) {
    const label = svgEl("text", {
      x: x(i),
      y: H - 6,
      "text-anchor": i === 0 ? "start" : i === count - 1 ? "end" : "middle",
    });
    label.textContent =
      t - count + 1 + i === t ? "heute" : shortDate(t - count + 1 + i);
    svg.append(label);
  }
  const readout = mk("p", "sread");
  const cursor = svgEl("line", {
    y1: PAD.top,
    y2: PAD.top + plotH,
    class: "cursor",
    visibility: "hidden",
  });
  svg.append(cursor);
  const show = (i: number) => {
    readout.textContent = read(i);
    cursor.setAttribute("x1", String(x(i)));
    cursor.setAttribute("x2", String(x(i)));
    cursor.setAttribute("visibility", "visible");
  };
  svg.onpointermove = svg.onpointerdown = (e) => {
    const box = svg.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * width;
    const i = Math.floor(((px - PAD.left) / plotW) * count);
    show(Math.max(0, Math.min(count - 1, i)));
  };
  svg.onpointerleave = () => {
    cursor.setAttribute("visibility", "hidden");
    readout.textContent = read(count - 1);
  };
  readout.textContent = read(count - 1);
  return { svg, readout, x, y, plotW, plotH };
}

function activityChart(t: number, count: number) {
  const days: (Day | undefined)[] = [];
  for (let day = t - count + 1; day <= t; day++) days.push(garden.days?.[day]);
  const max = niceMax(Math.max(...days.map(tasksOf), 1));
  const read = (i: number) => {
    const day = days[i];
    const date = longDate(t - count + 1 + i);
    const tasks = tasksOf(day);
    if (!tasks) return date + ": nicht geübt";
    const parts = MODES.filter((m) => day?.[m]?.n).map(
      (m) => NAMES[m] + " " + day![m]!.n,
    );
    return (
      date +
      ": " +
      plural(tasks, "Aufgabe", "Aufgaben") +
      " (" +
      parts.join(", ") +
      ") · " +
      percent(rightOf(day), tasks) +
      " gleich richtig · " +
      minutes(timeOf(day))
    );
  };
  const { svg, readout, x, y, plotW } = frame(t, count, max, read);
  const slot = plotW / count;
  const barW = Math.max(2, Math.min(18, slot - 2));
  days.forEach((day, i) => {
    let base = 0;
    const filled = MODES.filter((m) => day?.[m]?.n);
    filled.forEach((mode, k) => {
      const n = day![mode]!.n;
      const top = y(base + n);
      // a gap of 2px between the parts, the top part has round corners
      const bottom = y(base) - (k ? 1 : 0);
      const h = Math.max(1, bottom - top - (k < filled.length - 1 ? 1 : 0));
      const r = k === filled.length - 1 ? Math.min(4, barW / 2, h) : 0;
      svg.append(
        svgEl("path", {
          d: roundTop(x(i) - barW / 2, top, barW, h, r),
          class: "c-" + mode,
        }),
      );
      base += n;
    });
  });
  const part = mk("section", "spart");
  part.append(mk("h3", null, "Aufgaben pro Tag"), legend(), readout, svg);
  return part;
}

function roundTop(x: number, y: number, w: number, h: number, r: number) {
  return (
    `M${x},${y + h}V${y + r}` +
    (r ? `Q${x},${y} ${x + r},${y}` : "") +
    `H${x + w - r}` +
    (r ? `Q${x + w},${y} ${x + w},${y + r}` : "") +
    `V${y + h}Z`
  );
}

function learnChart(t: number, count: number) {
  const points = curve(garden, t, count);
  const max = niceMax(
    Math.max(1, ...points.flatMap((p) => (p ? MODES.map((m) => p[m]) : []))),
  );
  const read = (i: number) => {
    const p = points[i];
    const date = longDate(t - count + 1 + i);
    if (!p) return date + ": noch kein Verlauf";
    return date + ": " + MODES.map((m) => p[m] + " " + WHAT[m]).join(" · ");
  };
  const { svg, readout, x, y } = frame(t, count, max, read);
  for (const mode of MODES) {
    let d = "";
    points.forEach((p, i) => {
      if (!p) return;
      d += (d ? "L" : "M") + x(i).toFixed(1) + "," + y(p[mode]).toFixed(1);
    });
    if (!d) continue;
    svg.append(svgEl("path", { d, class: "line c-" + mode }));
    const last = points[count - 1];
    if (last)
      svg.append(
        svgEl("circle", {
          cx: x(count - 1),
          cy: y(last[mode]),
          r: 4,
          class: "dot c-" + mode,
        }),
      );
  }
  const part = mk("section", "spart");
  part.append(
    mk("h3", null, "Was schon sitzt"),
    mk(
      "p",
      "shint",
      "Eine Blüte, ein Heuballen oder eine Seerose zeigt eine Aufgabe, die an mehreren Tagen richtig war.",
    ),
    legend(),
    readout,
    svg,
  );
  return part;
}

// The rows of the multiplication and of the division.
function rowsPart() {
  const part = mk("section", "spart");
  part.append(mk("h3", null, "Die Reihen"));
  const table = mk("div", "srows");
  const head = mk("div", "srow shead");
  head.append(
    mk("span", null, "Reihe"),
    mk("span", null, "× Garten"),
    mk("span", null, ": Bauernhof"),
  );
  table.append(head);
  const farmFacts = garden.farm?.facts || {};
  for (let r = 1; r <= 10; r++) {
    const times = rowState(
      garden.facts,
      r,
      Array.from({ length: 10 }, (_, i) => keyOf(r, i + 1)),
    );
    const divide = rowState(
      farmFacts,
      r,
      Array.from({ length: 10 }, (_, i) => divKey(r, i + 1)),
    );
    const line = mk("div", "srow");
    line.append(
      mk("b", null, String(r)),
      rowCell(times, "garden"),
      rowCell(divide, "farm"),
    );
    table.append(line);
  }
  part.append(
    table,
    mk(
      "p",
      "shint",
      "Der Balken zeigt, wie viele der 10 Aufgaben schon blühen. Die Zahl daneben zeigt, wie oft die Antworten richtig waren.",
    ),
  );
  return part;
}

function rowCell(state: ReturnType<typeof rowState>, mode: Mode) {
  const cell = mk("span", "srcell");
  const answers = state.right + state.wrong;
  const bar = mk("span", "sbar small");
  const fill = mk("i", "c-" + mode);
  fill.style.width = state.done * 10 + "%";
  bar.append(fill);
  cell.title =
    state.done +
    " von 10 " +
    WHAT[mode] +
    ", " +
    percent(state.right, answers) +
    " richtig";
  cell.append(
    bar,
    mk("small", null, answers ? percent(state.right, answers) : "–"),
  );
  return cell;
}

function trickyPart() {
  const part = mk("section", "spart");
  part.append(mk("h3", null, "Hier hakt es noch"));
  const list = tricky(garden);
  if (!list.length) {
    part.append(mk("p", "shint", "Noch keine Fehler. Prima!"));
    return part;
  }
  const chips = mk("div", "stricky");
  for (const item of list) {
    const text =
      item.mode === "pond"
        ? item.key
        : item.mode === "farm"
          ? item.key.replace(":", " : ")
          : factors(item.key).join(" × ");
    const chip = mk("span", "c-" + item.mode + (item.wilt ? " wilt" : ""));
    chip.append(
      mk("b", null, text),
      mk("small", null, item.wrong + "× falsch von " + item.seen),
    );
    chips.append(chip);
  }
  part.append(
    chips,
    mk(
      "p",
      "shint",
      "Zuerst stehen die Aufgaben, die gerade welk sind. Das Spiel fragt sie von selbst öfter.",
    ),
  );
  return part;
}

export function initStars() {
  $("starBtn").onclick = openStars;
  $("starClose").onclick = closeStars;
  $("stars").onclick = (e) => {
    if (e.target === $("stars")) closeStars();
  };
  addEventListener("resize", () => {
    if (starsOpen()) renderStars();
  });
}
