import {
  clipPath,
  hasClip,
  swingClip,
  type Clip,
  type Lang,
} from "../rules/clips";
import { context, hushMusic } from "./sound";

// The voice of the game. The words of the pond have sound files, see
// `rules/clips.ts`. The voice of the browser reads all other texts: the own
// words and the English words. It differs from device to device, and some
// browsers have no German voice at all.

export type { Lang };

// Names of good voices. The English voice is British.
const GOOD: Record<Lang, RegExp> = {
  de: /Anna|Petra|Markus|Viktor|Yannick|Helena|Katja|Google Deutsch/i,
  en: /Daniel|Kate|Serena|Oliver|Arthur|Google UK English/i,
};
/** the language tag of the utterance, and the region that ranks first */
const TAG: Record<Lang, string> = { de: "de-DE", en: "en-GB" };

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

// Tells if the device has an English voice, so that the orchard can say it
// when the child hears nothing.
export function hasEnglishVoice(): boolean {
  return !!voices.en;
}

/** the pause between two sound files, in seconds */
const GAP = 0.3;
/** the time from the call to the first sound, in seconds */
const LEAD = 0.05;
/** the number of sounds that stay loaded */
const KEEP = 24;

const loaded = new Map<string, Promise<AudioBuffer | null>>();

/** the sounds that play now or wait for their turn */
let playing: AudioBufferSourceNode[] = [];

/** Counts the calls. A sound that loads for an older call does not play. */
let turn = 0;

async function fetchSound(path: string): Promise<AudioBuffer | null> {
  try {
    const ac = context();
    const res = ac && (await fetch("audio/" + path + ".mp3"));
    if (!ac || !res || !res.ok) return null;
    return await ac.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// Loads the sound file of a clip. The last sounds stay loaded, so that a word
// that the child hears again plays at once.
function load(clip: Clip): Promise<AudioBuffer | null> {
  const path = clipPath(clip);
  const sound = loaded.get(path) || fetchSound(path);
  loaded.delete(path);
  loaded.set(path, sound);
  if (loaded.size > KEEP) loaded.delete(loaded.keys().next().value!);
  // a sound that did not load gets a new try the next time
  void sound.then((buffer) => {
    if (!buffer && loaded.get(path) === sound) loaded.delete(path);
  });
  return sound;
}

// Plays the sounds one after the other.
function play(sounds: AudioBuffer[]) {
  const ac = context();
  if (!ac) return;
  let at = ac.currentTime + LEAD;
  for (const buffer of sounds) {
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.connect(ac.destination);
    source.start(at);
    playing.push(source);
    at += buffer.duration + GAP;
  }
  hushMusic(at - ac.currentTime);
}

// The voice of the browser reads the texts one after the other, slowly.
function read(texts: string[], rate: number, lang: Lang) {
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

// Says the texts one after the other. It stops what the voice says now. The
// rate is the speed of the voice of the browser, a sound file has its own.
export function say(texts: string[], rate = 0.8, lang: Lang = "de") {
  hush();
  const clips = texts.map((text): Clip => ({ lang, style: "plain", text }));
  if (!clips.every(hasClip)) return read(texts, rate, lang);
  const mine = turn;
  void Promise.all(clips.map(load)).then((sounds) => {
    if (mine !== turn) return;
    const ready = sounds.filter((sound) => sound !== null);
    // without the files the voice of the browser reads
    if (ready.length === sounds.length) play(ready);
    else read(texts, rate, lang);
  });
}

async function fetchStarts(clip: Clip): Promise<number[] | null> {
  try {
    const res = await fetch("audio/" + clipPath(clip) + ".json");
    return res.ok ? ((await res.json()) as number[]) : null;
  } catch {
    return null;
  }
}

// Says a word syllable by syllable. It gives the time from now to the start
// of each syllable, in seconds. It gives null when the word has no such
// sound, or when the voice says something else by now.
export async function saySwing(syllables: string[]): Promise<number[] | null> {
  hush();
  const clip = swingClip(syllables);
  if (!clip || !hasClip(clip)) return null;
  const mine = turn;
  const [sound, starts] = await Promise.all([load(clip), fetchStarts(clip)]);
  if (mine !== turn || !sound || starts?.length !== syllables.length)
    return null;
  play([sound]);
  return starts.map((start) => start + LEAD);
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
