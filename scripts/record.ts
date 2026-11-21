// Records the fixed texts of the pond and the orchard with voices of
// ElevenLabs, so that each device hears the same good voice. Run it after a
// change to the word lists:
//
//   node scripts/record.ts               records the texts without a recording
//   node scripts/record.ts --redo Kind   records this text again
//
// It records each text that is missing and removes each file that no text
// needs any more, so a run costs only the new texts. The key of ElevenLabs
// stands in the file `secret.env` as ELEVEN_KEY, or in the environment. It
// needs the right "Text to Speech".

import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createServer } from "vite";

type Lang = "de" | "en";

/** the voice and the model of each language */
const VOICES: Record<Lang, { voice: string; model: string }> = {
  // Piero
  de: { voice: "9aLXbGY4BEHhMWw0SgDi", model: "eleven_v4" },
  // Brittney, a British voice
  en: { voice: "jB2lPb5DhAX6l1TLkKXy", model: "eleven_v4" },
};

/** this note tells the model to say the syllables one by one, it is not spoken */
const SWING_NOTE = "[spricht langsam und deutlich, Silbe für Silbe] ";

/** the sound is mono, so this rate is enough for a voice */
const FORMAT = "mp3_44100_64";
const BYTES_PER_SECOND = 8000;

const TRIES = 3;
const PARALLEL = 3;
/** a first syllable that starts later than this has other sound before it, in seconds */
const LATE = 1.2;

const root = join(import.meta.dirname, "..");
const server = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true },
});
const clips = (await server.ssrLoadModule(
  "/src/rules/clips.ts",
)) as typeof import("../src/rules/clips");
await server.close();

/** one recording: a text as it stands, or a word syllable by syllable */
interface Job {
  lang: Lang;
  text: string;
  swing: boolean;
  /** the files of the recording, relative to `public` */
  files: string[];
}

interface Answer {
  audio_base64: string;
  alignment: {
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
}

interface Made {
  sound: Buffer;
  /** the second where each syllable starts, only for a word in syllables */
  starts?: number[];
  /** what looks wrong with the sound, "" when all is well */
  doubt: string;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const round = (seconds: number) => Math.round(seconds * 100) / 100;

let credits = 0;

async function ask(job: Job, key: string): Promise<Answer> {
  const { voice, model } = VOICES[job.lang];
  for (let wait = 2000; ; wait *= 2) {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=${FORMAT}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        // the language keeps a word as "Kind" or "Hand" German
        body: JSON.stringify({
          text: job.swing ? SWING_NOTE + job.text : job.text,
          model_id: model,
          language_code: job.lang,
        }),
      },
    );
    if (response.ok) {
      credits += Number(response.headers.get("character-cost") || 0);
      return (await response.json()) as Answer;
    }
    // too many requests at a time, or the service is busy
    if ((response.status === 429 || response.status >= 500) && wait <= 32000) {
      await sleep(wait);
      continue;
    }
    throw new Error(
      response.status + " " + (await response.text()).slice(0, 300),
    );
  }
}

// Reads the answer and checks what a program can check. Nobody hears the
// sound here, so the checks only find a sound that is much too long, and
// syllables that start too close or too late.
function read(job: Job, answer: Answer): Made {
  const sound = Buffer.from(answer.audio_base64, "base64");
  const seconds = sound.length / BYTES_PER_SECOND;
  const from = answer.alignment?.character_start_times_seconds;
  const to = answer.alignment?.character_end_times_seconds;
  if (!from || !to || !to.length) return { sound, doubt: "no times" };
  let doubt = "";
  const after = seconds - to[to.length - 1];
  if (after > 1.2) doubt = round(after) + " s of sound after the text";
  if (!job.swing) {
    if (seconds > 2 + job.text.length * 0.2)
      doubt = round(seconds) + " s is long for the text";
    return { sound, doubt };
  }
  const starts: number[] = [];
  let at = SWING_NOTE.length;
  for (const syllable of job.text.split("-")) {
    starts.push(round(from[at]));
    at += syllable.length + 1;
  }
  if (starts.some((start, i) => i > 0 && start - starts[i - 1] < 0.12))
    doubt = "the syllables start at " + starts.join(", ");
  // the model says more than the syllables: often the word comes two times
  if (starts[0] > LATE)
    doubt = "the first syllable starts only after " + starts[0] + " s";
  return { sound, starts, doubt };
}

// Records one text. A sound that looks wrong gets more tries, and the last
// try stays.
async function record(job: Job, key: string): Promise<string> {
  let made = read(job, await ask(job, key));
  for (let i = 1; made.doubt && i < TRIES; i++)
    made = read(job, await ask(job, key));
  for (const file of job.files) {
    const path = join(root, "public", file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      file.endsWith(".json") ? JSON.stringify(made.starts) : made.sound,
    );
  }
  return made.doubt;
}

const jobs: Job[] = [
  ...(Object.entries(clips.clipTexts()) as [Lang, string[]][]).flatMap(
    ([lang, texts]) =>
      texts.map((text) => ({
        lang,
        text,
        swing: false,
        files: [clips.clipPath(lang, text)],
      })),
  ),
  ...clips.swingTexts().map((text) => ({
    lang: "de" as const,
    text,
    swing: true,
    files: [clips.swingPath(text) + ".mp3", clips.swingPath(text) + ".json"],
  })),
];

const wanted = new Set(jobs.flatMap((job) => job.files));
if (wanted.size !== jobs.reduce((sum, job) => sum + job.files.length, 0))
  throw new Error("Two texts share a file name.");

const redo = new Set<string>();
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--redo" && args[i + 1]) redo.add(args[++i]);
  else throw new Error("Unknown option " + args[i] + ". Use --redo <text>.");
}

const dir = join(root, "public", "voice");
let removed = 0;
if (existsSync(dir))
  for (const name of readdirSync(dir, { recursive: true }) as string[]) {
    const file = "voice/" + name.replaceAll("\\", "/");
    if (/\.(mp3|json)$/.test(file) && !wanted.has(file)) {
      rmSync(join(root, "public", file));
      removed++;
    }
  }

// a word in syllables is also found without its hyphens
const todo = jobs.filter(
  (job) =>
    redo.has(job.text) ||
    (job.swing && redo.has(job.text.replaceAll("-", ""))) ||
    job.files.some((file) => !existsSync(join(root, "public", file))),
);

const doubts: string[] = [];
const failed: string[] = [];
if (todo.length) {
  if (!process.env.ELEVEN_KEY && existsSync(join(root, "secret.env")))
    process.loadEnvFile(join(root, "secret.env"));
  const key = process.env.ELEVEN_KEY;
  if (!key) throw new Error("ELEVEN_KEY is missing, put it in secret.env.");
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const job = todo[next++];
      const name = job.files[0] + ' "' + job.text + '"';
      try {
        const doubt = await record(job, key);
        if (doubt) doubts.push(name + ": " + doubt);
      } catch (error) {
        failed.push(name + ": " + (error as Error).message);
      }
      if (next % 50 === 0) console.log(next + " of " + todo.length);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

console.log(
  "Recorded " +
    (todo.length - failed.length) +
    " texts for " +
    credits +
    " credits, removed " +
    removed +
    " files.",
);
if (doubts.length)
  console.log(
    "\nListen to these " +
      doubts.length +
      ", they may be wrong:\n" +
      doubts.join("\n"),
  );
if (failed.length) {
  console.log("\nThese " + failed.length + " failed:\n" + failed.join("\n"));
  process.exitCode = 1;
}
