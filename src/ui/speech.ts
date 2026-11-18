import { clipPath, clipTexts, type Lang } from "../rules/clips";
import { context, hushMusic, voiceOut } from "./sound";

// The voice reads the words. The fixed texts have a recording of a voice of a
// Mac, so each device hears the same voice. The voice of the browser reads
// the own words. It differs from device to device, and some browsers have no
// German voice at all.

export type { Lang };

// Names of good voices. The English voice is British.
const GOOD: Record<Lang, RegExp> = {
  de: /Anna|Petra|Markus|Viktor|Yannick|Helena|Katja|Google Deutsch/i,
  en: /Daniel|Kate|Serena|Oliver|Arthur|Google UK English/i,
};
/** the language tag of the utterance, and the region that ranks first */
const TAG: Record<Lang, string> = { de: "de-DE", en: "en-GB" };

/** the pause between two recordings, in seconds */
const GAP = 0.5;

const voices: Record<Lang, SpeechSynthesisVoice | null> = {
  de: null,
  en: null,
};

const synth = (): SpeechSynthesis | null =>
  "speechSynthesis" in window ? window.speechSynthesis : null;

function rank(v: SpeechSynthesisVoice, lang: Lang): number {
  return (
    (v.lang.replace("_", "-").startsWith(TAG[lang]) ? 4 : 0) +
    (/premium|enhanced|erweitert/i.test(v.name) ? 3 : 0) +
    (GOOD[lang].test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0)
  );
}

function pickVoices() {
  const all = synth()?.getVoices() || [];
  for (const lang of ["de", "en"] as const) {
    const found = all.filter((v) =>
      v.lang.replace("_", "-").toLowerCase().startsWith(lang),
    );
    voices[lang] =
      found.sort((a, b) => rank(b, lang) - rank(a, lang))[0] || null;
  }
}

export function initSpeech() {
  const s = synth();
  if (!s) return;
  pickVoices();
  // the voices load late in some browsers
  s.addEventListener?.("voiceschanged", pickVoices);
}

let recorded: Record<Lang, Set<string>> | null = null;

function hasClip(text: string, lang: Lang): boolean {
  if (!recorded) {
    const texts = clipTexts();
    recorded = { de: new Set(texts.de), en: new Set(texts.en) };
  }
  return recorded[lang].has(text);
}

// Tells if the page can read the text, so that the orchard can say it when
// the child hears nothing.
export function canSay(text: string, lang: Lang): boolean {
  return hasClip(text, lang) || !!voices[lang];
}

/** the loaded recordings by path, null for a recording that fails */
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function load(ac: AudioContext, path: string): Promise<AudioBuffer | null> {
  let buffer = buffers.get(path);
  if (!buffer) {
    buffer = fetch(path)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((data) => (data ? ac.decodeAudioData(data) : null))
      .catch(() => null);
    buffers.set(path, buffer);
  }
  return buffer;
}

/** counts each start and stop, so that a late recording stays quiet */
let turn = 0;
let playing: AudioBufferSourceNode[] = [];

// Plays the recordings one after the other. The voice of the browser reads
// the texts when a recording fails to load.
async function play(texts: string[], rate: number, lang: Lang) {
  const mine = turn;
  const ac = context();
  const out = voiceOut();
  if (!ac || !out) return speak(texts, rate, lang);
  const loaded = await Promise.all(
    texts.map((text) => load(ac, clipPath(lang, text))),
  );
  if (mine !== turn) return;
  if (loaded.some((buffer) => !buffer)) return speak(texts, rate, lang);
  try {
    let at = ac.currentTime + 0.05;
    for (const buffer of loaded as AudioBuffer[]) {
      const source = ac.createBufferSource();
      source.buffer = buffer;
      source.connect(out);
      source.start(at);
      playing.push(source);
      at += buffer.duration + GAP;
    }
    hushMusic(at - ac.currentTime);
  } catch {}
}

// The voice of the browser reads the texts, slowly.
function speak(texts: string[], rate: number, lang: Lang) {
  const s = synth();
  if (!s) return;
  try {
    let seconds = 0.4;
    for (const text of texts) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = TAG[lang];
      if (voices[lang]) utterance.voice = voices[lang];
      utterance.rate = rate;
      s.speak(utterance);
      seconds += 0.5 + text.length * 0.09;
    }
    hushMusic(seconds);
  } catch {}
}

// Reads the texts one after the other. It stops what the voice reads now.
export function say(texts: string[], rate = 0.8, lang: Lang = "de") {
  hush();
  if (texts.every((text) => hasClip(text, lang))) void play(texts, rate, lang);
  else speak(texts, rate, lang);
}

export function hush() {
  turn++;
  for (const source of playing)
    try {
      source.stop();
    } catch {}
  playing = [];
  try {
    synth()?.cancel();
  } catch {}
}
