import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { CLIPS, clipPath, type Clip, type Lang } from "../src/rules/clips";

// Makes the voice files of the game with ElevenLabs. The script reads the
// clips from the word lists, makes each file that is missing, and removes each
// file that no clip needs any more. So a run after a change of the word lists
// costs only the new texts.
//
//   npm run voice                 makes the missing files
//   npm run voice -- --redo Kind  makes the files of this text again
//
// The key stands in the file `secret.env` as ELEVEN_KEY, or in the environment.

const DIR = "public/audio";

/** the voice and the model of each language */
const VOICES: Record<Lang, { voice: string; model: string }> = {
  // Piero
  de: { voice: "9aLXbGY4BEHhMWw0SgDi", model: "eleven_v4" },
  // Brittney, a British voice
  en: { voice: "jB2lPb5DhAX6l1TLkKXy", model: "eleven_v4" },
};

/** this note tells the model to speak the syllables one by one, it is not spoken */
const SWING_NOTE = "[spricht langsam und deutlich, Silbe für Silbe] ";

/** the sound is mono, so this rate is enough for a voice */
const FORMAT = "mp3_44100_64";
const BYTES_PER_SECOND = 8000;

const TRIES = 3;
/** a first syllable that starts later than this has other sound before it, in seconds */
const LATE = 1.2;
const WORKERS = 3;

interface Answer {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  } | null;
}

interface Made {
  sound: Buffer;
  /** the second where each syllable starts, only for a clip to swing */
  starts?: number[];
  /** what looks wrong with the sound, "" when all is well */
  doubt: string;
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const round = (seconds: number) => Math.round(seconds * 100) / 100;

let credits = 0;

async function ask(clip: Clip, key: string): Promise<Answer> {
  const { voice, model } = VOICES[clip.lang];
  const text = clip.style === "swing" ? SWING_NOTE + clip.text : clip.text;
  for (let wait = 2000; ; wait *= 2) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=${FORMAT}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        // the language keeps a word as "Kind" or "Hand" German
        body: JSON.stringify({
          text,
          model_id: model,
          language_code: clip.lang,
        }),
      },
    );
    if (res.ok) {
      credits += Number(res.headers.get("character-cost") || 0);
      return (await res.json()) as Answer;
    }
    // too many requests at a time, or the service is busy
    if ((res.status === 429 || res.status >= 500) && wait <= 32000) {
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

// Reads the answer and checks what a program can check. Nobody hears the
// sound here, so the checks only find a sound that is much too long, and
// syllables that start too close or too late.
function read(clip: Clip, answer: Answer): Made {
  const sound = Buffer.from(answer.audio_base64, "base64");
  const seconds = sound.length / BYTES_PER_SECOND;
  const from = answer.alignment?.character_start_times_seconds;
  const to = answer.alignment?.character_end_times_seconds;
  if (!from || !to || !to.length) return { sound, doubt: "no times" };
  const spokenTo = to[to.length - 1];
  let doubt = "";
  if (seconds - spokenTo > 1.2)
    doubt = `${round(seconds - spokenTo)} s of sound after the text`;
  if (clip.style !== "swing") {
    if (seconds > 2 + clip.text.length * 0.2)
      doubt = `${round(seconds)} s is long for the text`;
    return { sound, doubt };
  }
  const starts: number[] = [];
  let at = SWING_NOTE.length;
  for (const syllable of clip.text.split("-")) {
    starts.push(round(from[at]));
    at += syllable.length + 1;
  }
  if (starts.some((start, i) => i > 0 && start - starts[i - 1] < 0.12))
    doubt = `the syllables start at ${starts.join(", ")}`;
  // the model says more than the syllables: often the word comes two times
  if (starts[0] > LATE)
    doubt = `the first syllable starts only after ${starts[0]} s`;
  return { sound, starts, doubt };
}

// Makes the files of one clip. A sound that looks wrong gets more tries, and
// the last try stays.
async function make(clip: Clip, key: string): Promise<string> {
  let made = read(clip, await ask(clip, key));
  for (let i = 1; made.doubt && i < TRIES; i++)
    made = read(clip, await ask(clip, key));
  const path = join(DIR, clipPath(clip));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path + ".mp3", made.sound);
  if (made.starts) writeFileSync(path + ".json", JSON.stringify(made.starts));
  return made.doubt;
}

/** the files that a clip needs */
const files = (clip: Clip) =>
  clip.style === "swing"
    ? [clipPath(clip) + ".mp3", clipPath(clip) + ".json"]
    : [clipPath(clip) + ".mp3"];

function present(): string[] {
  if (!existsSync(DIR)) return [];
  return (readdirSync(DIR, { recursive: true }) as string[])
    .map((name) => name.replaceAll("\\", "/"))
    .filter((name) => /\.(mp3|json)$/.test(name));
}

async function main() {
  const redo = new Set<string>();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--redo" && args[i + 1]) redo.add(args[++i]);
    else throw new Error(`Unknown option ${args[i]}. Use --redo <text>.`);
  }

  const have = new Set(present());
  const needed = new Set(CLIPS.flatMap(files));
  for (const name of have)
    if (!needed.has(name)) {
      rmSync(join(DIR, name));
      console.log("removed", name);
    }

  const todo = CLIPS.filter(
    (clip) =>
      redo.has(clip.text) ||
      redo.has(clip.text.replaceAll("-", "")) ||
      files(clip).some((name) => !have.has(name)),
  );
  if (!todo.length) return console.log("All voice files are there.");

  if (!process.env.ELEVEN_KEY && existsSync("secret.env"))
    process.loadEnvFile("secret.env");
  const key = process.env.ELEVEN_KEY;
  if (!key) throw new Error("ELEVEN_KEY is missing, put it in secret.env.");

  console.log(`Making ${todo.length} of ${CLIPS.length} clips.`);
  const doubts: string[] = [];
  const failed: string[] = [];
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < todo.length) {
      const clip = todo[next++];
      const name = `${clipPath(clip)}.mp3 "${clip.text}"`;
      try {
        const doubt = await make(clip, key);
        if (doubt) doubts.push(`${name}: ${doubt}`);
      } catch (error) {
        failed.push(`${name}: ${(error as Error).message}`);
      }
      if (++done % 50 === 0) console.log(`${done} of ${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));

  console.log(`Done, this run cost ${credits} credits.`);
  if (doubts.length)
    console.log(
      `\nListen to these ${doubts.length}, they may be wrong:\n` +
        doubts.join("\n"),
    );
  if (failed.length) {
    console.log(`\nThese ${failed.length} failed:\n` + failed.join("\n"));
    process.exitCode = 1;
  }
}

await main();
