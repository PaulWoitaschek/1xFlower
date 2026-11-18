import { hushMusic } from "./sound";

// The voice of the browser reads the words. It differs from device to device,
// and some browsers have no German voice at all.

const GOOD = /Anna|Petra|Markus|Viktor|Yannick|Helena|Katja|Google Deutsch/i;

let voice: SpeechSynthesisVoice | null = null;

const synth = (): SpeechSynthesis | null =>
  "speechSynthesis" in window ? window.speechSynthesis : null;

function rank(v: SpeechSynthesisVoice): number {
  return (
    (v.lang.replace("_", "-").startsWith("de-DE") ? 4 : 0) +
    (/premium|enhanced|erweitert/i.test(v.name) ? 3 : 0) +
    (GOOD.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0)
  );
}

function pickVoice() {
  const german = (synth()?.getVoices() || []).filter((v) =>
    v.lang.toLowerCase().startsWith("de"),
  );
  voice = german.sort((a, b) => rank(b) - rank(a))[0] || null;
}

export function initSpeech() {
  const s = synth();
  if (!s) return;
  pickVoice();
  // the voices load late in some browsers
  s.addEventListener?.("voiceschanged", pickVoice);
}

// Reads the texts one after the other, slowly. It stops what the voice reads now.
export function say(texts: string[], rate = 0.8) {
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
    let seconds = 0.4;
    for (const text of texts) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      if (voice) utterance.voice = voice;
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
