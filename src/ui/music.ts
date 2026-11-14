import { BPM, tune, type Note, type Voice } from "../art/tune";
import { context, musicOut } from "./sound";
import { store } from "./state";

const BEAT = 60 / BPM;
const BAR = 4 * BEAT;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(ac: BaseAudioContext): AudioBuffer {
  let buffer = noises.get(ac);
  if (!buffer) {
    buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noises.set(ac, buffer);
  }
  return buffer;
}

/** a gain that rises fast and then fades out */
function envelope(
  ac: BaseAudioContext,
  out: AudioNode,
  t: number,
  peak: number,
  attack: number,
  hold: number,
  sustain: number,
  release: number,
): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(
    Math.max(peak * sustain, 0.0001),
    t + hold,
  );
  g.gain.exponentialRampToValueAtTime(0.0001, t + hold + release);
  g.connect(out);
  return g;
}

function osc(
  ac: BaseAudioContext,
  type: OscillatorType,
  f: number,
  t: number,
  end: number,
  out: AudioNode,
) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.connect(out);
  o.start(t);
  o.stop(end);
  return o;
}

function hiss(
  ac: BaseAudioContext,
  t: number,
  dur: number,
  filter: BiquadFilterType,
  f: number,
  out: AudioNode,
) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const bq = ac.createBiquadFilter();
  bq.type = filter;
  bq.frequency.value = f;
  src.connect(bq).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur);
}

const INSTRUMENTS: Record<
  Voice,
  (ac: BaseAudioContext, out: AudioNode, t: number, n: Note) => void
> = {
  // an upright bass: a soft plucked tone with its octave on top
  bass(ac, out, t, n) {
    const f = hz(n.midi);
    const dur = n.len * BEAT;
    const g = envelope(ac, out, t, 0.13 * n.vol, 0.012, dur, 0.35, 0.08);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    lp.connect(g);
    osc(ac, "triangle", f, t, t + dur + 0.1, lp);
    const top = ac.createGain();
    top.gain.value = 0.35;
    top.connect(g);
    osc(ac, "sine", f * 2, t, t + dur + 0.1, top);
  },
  // an electric piano: a sine whose brightness fades fast
  keys(ac, out, t, n) {
    const f = hz(n.midi);
    const dur = n.len * BEAT;
    const g = envelope(ac, out, t, 0.035 * n.vol, 0.005, dur, 0.45, 0.25);
    const carrier = osc(ac, "sine", f, t, t + dur + 0.3, g);
    const depth = ac.createGain();
    depth.gain.setValueAtTime(f * 1.8, t);
    depth.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.3);
    depth.connect(carrier.frequency);
    osc(ac, "sine", f, t, t + dur + 0.3, depth);
  },
  // a vibraphone: a ringing bell tone that wobbles
  vibe(ac, out, t, n) {
    const f = hz(n.midi);
    const ring = n.len * BEAT + 0.6;
    const wobble = ac.createGain();
    wobble.gain.value = 0.8;
    wobble.connect(out);
    const lfo = ac.createGain();
    lfo.gain.value = 0.2;
    lfo.connect(wobble.gain);
    osc(ac, "sine", 5.5, t, t + ring, lfo);
    const g = envelope(ac, wobble, t, 0.1 * n.vol, 0.004, ring, 0.002, 0.05);
    osc(ac, "sine", f, t, t + ring + 0.1, g);
    const shine = envelope(
      ac,
      wobble,
      t,
      0.02 * n.vol,
      0.002,
      0.25,
      0.01,
      0.05,
    );
    osc(ac, "sine", f * 4, t, t + 0.35, shine);
  },
  ride(ac, out, t, n) {
    hiss(
      ac,
      t,
      0.5,
      "highpass",
      6500,
      envelope(ac, out, t, 0.04 * n.vol, 0.002, 0.4, 0.01, 0.05),
    );
    const ping = envelope(ac, out, t, 0.004 * n.vol, 0.002, 0.3, 0.05, 0.05);
    osc(ac, "square", 3870, t, t + 0.4, ping);
  },
  hat(ac, out, t, n) {
    hiss(
      ac,
      t,
      0.1,
      "highpass",
      8000,
      envelope(ac, out, t, 0.022 * n.vol, 0.002, 0.045, 0.05, 0.02),
    );
  },
  kick(ac, out, t, n) {
    const g = envelope(ac, out, t, 0.09 * n.vol, 0.004, 0.16, 0.05, 0.05);
    const o = osc(ac, "sine", 95, t, t + 0.25, g);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  },
  brush(ac, out, t, n) {
    hiss(
      ac,
      t,
      0.25,
      "bandpass",
      2800,
      envelope(ac, out, t, 0.03 * n.vol, 0.015, 0.14, 0.05, 0.05),
    );
  },
};

/** plays the notes of one bar, which starts at time t */
export function playBar(
  ac: BaseAudioContext,
  out: AudioNode,
  t: number,
  notes: Note[],
) {
  for (const n of notes) {
    // a little loose, like real players
    const late = n.voice === "bass" ? 0 : Math.random() * 0.012;
    INSTRUMENTS[n.voice](ac, out, t + n.at * BEAT + late, n);
  }
}

interface Session {
  out: GainNode;
  timer: ReturnType<typeof setInterval>;
}

let session: Session | null = null;
let tapped = false;

function begin(ac: AudioContext, bus: AudioNode) {
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, ac.currentTime);
  out.gain.exponentialRampToValueAtTime(1, ac.currentTime + 2);
  out.connect(bus);
  const bars = tune();
  let next = ac.currentTime + 0.1;
  const tick = () => {
    while (next < ac.currentTime + 0.4) {
      playBar(ac, out, next, bars.next().value!);
      next += BAR;
    }
  };
  tick();
  session = { out, timer: setInterval(tick, 100) };
}

function end(ac: AudioContext) {
  const { out, timer } = session!;
  session = null;
  clearInterval(timer);
  out.gain.cancelScheduledValues(ac.currentTime);
  out.gain.setValueAtTime(out.gain.value, ac.currentTime);
  out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4);
  setTimeout(() => out.disconnect(), 600);
}

/** starts or stops the music, as the switch and the page want it */
export function syncMusic() {
  const want = store.music && tapped && document.visibilityState === "visible";
  if (!want && !session) return;
  const ac = context();
  const bus = musicOut();
  if (!ac || !bus) return;
  if (want && !session) begin(ac, bus);
  else if (!want && session) end(ac);
}

export function initMusic() {
  // the browser lets a page play sound only after the first tap
  const unlock = () => {
    tapped = true;
    syncMusic();
  };
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
  document.addEventListener("visibilitychange", syncMusic);
}
