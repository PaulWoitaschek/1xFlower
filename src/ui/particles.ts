import { FLOWERS, flowerColor } from "../art/flowers";
import { factors } from "../rules/garden";
import { $, reduce } from "./dom";
import { sess } from "./state";

interface Particle {
  kind: "drop" | "star" | "petal";
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** gravity */
  g: number;
  /** sideways wobble */
  wob: number;
  r: number;
  /** color */
  c: string;
  /** angle */
  a: number;
  /** spin */
  s: number;
  /** age in frames */
  t: number;
  max: number;
}

let parts: Particle[] = [];
let running = false;
let ctx: CanvasRenderingContext2D | null = null;

function loop() {
  const canvas = $<HTMLCanvasElement>("fx");
  const c = ctx || (ctx = canvas.getContext("2d")!);
  if (canvas.width !== innerWidth || canvas.height !== innerHeight) {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  c.clearRect(0, 0, canvas.width, canvas.height);
  parts = parts.filter((p) => p.t < p.max);
  parts.forEach((p) => {
    p.t++;
    if (p.kind === "drop") {
      p.vy += 0.35;
      p.y += p.vy;
    } else {
      p.vy = Math.min(p.vy + p.g, 3.2);
      p.vx *= 0.985;
      p.x += p.vx + Math.sin(p.t * 0.08 + p.a) * p.wob;
      p.y += p.vy;
      p.a += p.s;
    }
    c.globalAlpha = Math.max(0, 1 - p.t / p.max);
    c.fillStyle = p.c;
    c.save();
    c.translate(p.x, p.y);
    if (p.kind === "drop") {
      c.beginPath();
      c.moveTo(0, -p.r * 1.6);
      c.quadraticCurveTo(p.r, 0, 0, p.r * 0.7);
      c.quadraticCurveTo(-p.r, 0, 0, -p.r * 1.6);
      c.fill();
    } else if (p.kind === "star") {
      c.rotate(p.a);
      c.beginPath();
      for (let k = 0; k < 8; k++) {
        const rr = k % 2 ? p.r * 0.35 : p.r;
        c.lineTo(
          Math.cos((k * Math.PI) / 4) * rr,
          Math.sin((k * Math.PI) / 4) * rr,
        );
      }
      c.fill();
    } else {
      c.rotate(p.a);
      c.beginPath();
      c.ellipse(0, 0, p.r * 0.45, p.r, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });
  c.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(loop);
  else {
    running = false;
    c.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function addParts(more: Particle[]) {
  if (reduce) return;
  parts.push(...more);
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
}

const themeColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function flowerPoint() {
  const r = $("hero").querySelector(".pot")!.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.3, w: r.width };
}

export function sparkle(n: number) {
  const { x, y } = flowerPoint();
  const petal = flowerColor(factors(sess.cur)[0]);
  const sun = themeColor("--sun");
  addParts(
    Array.from({ length: n }, (_, i): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      return {
        kind: i % 3 === 0 ? "star" : "petal",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        g: 0.12,
        wob: 0.3,
        r: Math.random() * 3 + 3,
        c: i % 3 === 0 ? sun : petal,
        a: Math.random() * 6,
        s: Math.random() * 0.2 + 0.05,
        t: 0,
        max: 55 + Math.random() * 20,
      };
    }),
  );
}

export function rainOnFlower() {
  const { x, y, w } = flowerPoint();
  const rain = themeColor("--rain");
  addParts(
    Array.from({ length: 12 }, (_, i): Particle => ({
      kind: "drop",
      x: x + (Math.random() - 0.5) * w * 1.1,
      y: y - 60 - Math.random() * 50,
      vx: 0,
      vy: Math.random() * 2,
      g: 0,
      wob: 0,
      r: 2.6,
      c: rain,
      a: 0,
      s: 0,
      t: -i * 2,
      max: 30,
    })),
  );
}

export function confetti() {
  const W = innerWidth;
  const H = innerHeight;
  const colors = FLOWERS.map((f) => f[0]).filter((c) => c !== "#FFFFFF");
  addParts(
    Array.from({ length: 80 }, (): Particle => ({
      kind: "petal",
      x: W / 2 + (Math.random() - 0.5) * W * 0.35,
      y: H * 0.32,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 9 - 3,
      g: 0.22,
      wob: 0.6,
      r: Math.random() * 4 + 4,
      c: colors[Math.floor(Math.random() * colors.length)],
      a: Math.random() * 6,
      s: Math.random() * 0.2 + 0.05,
      t: 0,
      max: 110,
    })),
  );
}
