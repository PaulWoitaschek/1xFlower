import { store } from "./state";

let ac: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (!store.sound) return null;
  try {
    if (!ac) {
      const Context =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ac = new Context();
      master = ac.createGain();
      master.gain.value = 0.8;
      master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  } catch {
    return null;
  }
}

interface ToneOptions {
  type?: OscillatorType;
  vol?: number;
  to?: number;
  attack?: number;
}

function tone(f: number, t: number, dur: number, o: ToneOptions = {}) {
  const osc = ac!.createOscillator();
  const g = ac!.createGain();
  const vol = o.vol || 0.12;
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur * 0.9);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function bell(f: number, t: number, dur = 0.6, vol = 0.11) {
  tone(f, t, dur, { vol });
  tone(f * 2.01, t, dur * 0.55, { vol: vol * 0.3 });
  tone(f * 3.98, t, dur * 0.25, { vol: vol * 0.12 });
}

const SFX = {
  tap(t: number) {
    tone(620, t, 0.06, { vol: 0.05, to: 480 });
  },
  del(t: number) {
    tone(420, t, 0.07, { vol: 0.04, to: 300 });
  },
  good(t: number) {
    bell(1046.5, t, 0.55);
    bell(1568, t + 0.09, 0.7);
    tone(330, t + 0.12, 0.4, {
      type: "triangle",
      vol: 0.05,
      to: 760,
      attack: 0.05,
    });
  },
  streak(t: number) {
    [784, 988, 1175, 1568].forEach((f, i) =>
      bell(f, t + 0.25 + i * 0.07, 0.5, 0.08),
    );
  },
  bloom(t: number) {
    [523, 659, 784, 1047, 1175, 1319, 1568, 2093].forEach((f, i) =>
      bell(f, t + i * 0.06, 0.8, 0.075),
    );
    tone(2637, t + 0.5, 0.9, { vol: 0.03, attack: 0.2 });
    tone(3136, t + 0.62, 0.8, { vol: 0.025, attack: 0.2 });
  },
  bad(t: number) {
    tone(392, t, 0.2, { type: "triangle", vol: 0.09, to: 349 });
    tone(330, t + 0.17, 0.38, { type: "triangle", vol: 0.09, to: 262 });
  },
  water(t: number) {
    [1400, 1100, 1700, 1250].forEach((f, i) =>
      tone(f, t + i * 0.08, 0.11, { vol: 0.06, to: f * 0.55 }),
    );
    bell(1318.5, t + 0.36, 0.5, 0.07);
  },
  buzz(t: number) {
    tone(185, t, 0.55, { type: "sawtooth", vol: 0.022, to: 235, attack: 0.1 });
    tone(196, t + 0.3, 0.6, {
      type: "sawtooth",
      vol: 0.02,
      to: 165,
      attack: 0.1,
    });
  },
  flutter(t: number) {
    [1568, 2093, 1760, 2349, 2637].forEach((f, i) =>
      bell(f, t + 0.15 + i * 0.09, 0.4, 0.035),
    );
  },
  done(t: number) {
    [523, 659, 784].forEach((f, i) => bell(f, t + i * 0.12, 0.7, 0.09));
  },
  fanfare(t: number) {
    [523, 659, 784, 1047].forEach((f, i) => bell(f, t + i * 0.11, 0.6, 0.09));
    [523, 659, 784, 1047].forEach((f) => bell(f, t + 0.55, 1.2, 0.06));
  },
};

// All sounds are synthesized, the game has no sound files.
export function sfx(name: keyof typeof SFX) {
  const a = audio();
  if (!a) return;
  try {
    SFX[name](a.currentTime + 0.01);
  } catch {}
}
