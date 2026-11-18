import { hushMusic } from "./sound";

// The voice of the browser reads the words. It differs from device to device,
// and some browsers have no German voice at all.

export type Lang = "de" | "en";

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

// Reads the texts one after the other, slowly. It stops what the voice reads now.
export function say(texts: string[], rate = 0.8, lang: Lang = "de") {
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
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

export function hush() {
  try {
    synth()?.cancel();
  } catch {}
}
