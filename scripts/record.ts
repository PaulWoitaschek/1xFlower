// Records the fixed texts of the pond and the orchard with the voices of a
// Mac, so that each device hears the same good voice. Run it on a Mac after
// a change to the word lists:
//
//   node scripts/record.ts          records the texts without a recording
//   node scripts/record.ts --all    records all texts again
//
// It needs `say`, ffmpeg, and the voices "Anna (Premium)" and
// "Serena (Premium)". Load them in System Settings → Accessibility →
// Read & Speak → System voice → Manage Voices.

import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createServer } from "vite";

const run = promisify(execFile);

const VOICES = { de: "Anna (Premium)", en: "Serena (Premium)" } as const;
/** slower than the voice speaks by itself, for children */
const TEMPO = 0.8;
const PARALLEL = 4;

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

const all = process.argv.includes("--all");
const temp = mkdtempSync(join(tmpdir(), "record-"));

const { stdout } = await run("say", ["-v", "?"]);
for (const voice of Object.values(VOICES))
  if (!stdout.includes(voice + " ")) {
    console.error("The voice " + voice + " is missing on this Mac.");
    process.exit(1);
  }

async function record(lang: keyof typeof VOICES, text: string, out: string) {
  const raw = join(temp, clips.clipName(text) + "-" + lang + ".aiff");
  await run("say", ["-v", VOICES[lang], "-o", raw, text]);
  // cuts the silence at both ends, slows the voice down, and makes a small mp3
  const trim =
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05";
  await run("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-i",
    raw,
    "-af",
    [trim, "areverse", trim, "areverse", "atempo=" + TEMPO].join(","),
    "-ac",
    "1",
    "-ar",
    "22050",
    "-b:a",
    "40k",
    out,
  ]);
  rmSync(raw);
}

let made = 0;
let removed = 0;
for (const [lang, texts] of Object.entries(clips.clipTexts()) as [
  keyof typeof VOICES,
  string[],
][]) {
  const dir = join(root, "public", "voice", lang);
  mkdirSync(dir, { recursive: true });
  const wanted = new Map(
    texts.map((text) => [clips.clipName(text) + ".mp3", text]),
  );
  if (wanted.size !== texts.length)
    throw new Error("Two texts share a file name in " + lang);
  for (const file of readdirSync(dir))
    if (!wanted.has(file)) {
      rmSync(join(dir, file));
      removed++;
    }
  const todo = [...wanted].filter(
    ([file]) => all || !existsSync(join(dir, file)),
  );
  for (let i = 0; i < todo.length; i += PARALLEL)
    await Promise.all(
      todo
        .slice(i, i + PARALLEL)
        .map(([file, text]) => record(lang, text, join(dir, file))),
    );
  made += todo.length;
}

rmSync(temp, { recursive: true });
console.log("Recorded " + made + " texts, removed " + removed + " files.");
