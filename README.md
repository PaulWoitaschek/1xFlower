# Einmaleins-Garten

A game to practice the multiplication tables. Each task is a plant in a garden, and each right answer makes its plant grow.

The garden asks all rows. The address with `?reihen` shows the choice of the rows again, as in the tests.

The farm practices the division. Each task is a patch of meadow: right answers let the grass grow until it becomes hay. A chick hatches from the egg in the nest, and the chickens eat the hay or the blooms of the garden. When the flock is full, with twelve chickens, the hens lay their eggs into a basket. To feed a bloom a × b, the child divides a × b by a, and the bloom grows again in the garden, so that the child repeats it. The bud and the bloom each come only on a later day, so a plant blooms only when the child still knows its task on other days. A bloom gets thirsty after some days, and a right answer waters it.

The pond practices the spelling. Each word is a water lily. The child sees a picture and a sentence with a gap, hears the word, and types it on a keyboard in the game. A recorded voice reads the words, their sentences and the help words, so the sound must be on. The voice of the browser reads the own words, and some browsers have no German voice. A wrong word is no punishment. The child gets a tip with one of the four strategies of FRESCH: to swing the syllables, to lengthen the word, to derive it from a related word, and to remember it. For the swinging, the voice says the word syllable by syllable and a frog hops along. Then the child tries a second time. A word that is right at the second try brings fewer points and comes back soon. A word that is wrong again shows the solution, and the child copies it. A word that is right at the first try lets its lily grow. The bud and the bloom each come only on a later day, as in the garden. The child can add the own words from school, and the pond can ask only these words. A hyphen shows the syllables, as in Fahr-rad. Open lilies bring animals to the pond.

The orchard practices English words. Each word is a fruit tree. The first word list is "Travelling" from the school book. At first the child sees an English word, hears it, and chooses the German meaning from four. When the tree has grown, the child sees the German meaning and chooses the English word. At the highest levels the child types the English text on the keyboard of the game. A picture shows the word where there is one, but never beside the English word that the child must understand. The child hears each word once after the answer, when the sound is on. A recorded British voice reads the words of the lists, and the voice of the browser reads the own words when the browser has an English voice. Without such a voice, the game still works. A wrong choice wilts the tree and the word comes back soon. A wrong text gets a second try, and the page shows how far the text is right, but not the solution. A tree that grows to the fruit brings animals to the orchard. The child can drop groups of words, switch the typing off, and add the own words from school as "apple = Apfel". The orchard can ask only these words.

The star in the header opens the stars of the child. Each day with 10, 30 and 50 tasks brings a star, in all three games together, and the sheet shows the stars of the last two weeks, the days in a row and what blooms. Under "Für Eltern" the parents see the last seven days, the tasks of each day, what blooms over time, the rows of the multiplication and the division, and the tasks that go wrong most often. The game keeps each day in a diary from the first answer after this change, for about a year.

Play it at https://1xflower.woitaschek.de/.

## Development

You need Node.js. CI uses version 26.

- `npm install` installs the tools.
- `npm run dev` starts the page and loads each change at once.
- `npm test` runs the unit tests of the game rules.
- `npm run e2e` builds the page and plays it in a browser. Run `npx playwright install chromium` one time before.
- `npm run typecheck` checks the types.
- `npm run format` formats all files.
- `node scripts/record.ts` records the fixed texts of the pond and the orchard, see below.

## Structure

- `index.html` and `src/style.css` hold the markup and the styles.
- `src/rules` holds the game rules. This code does not use the browser, and each rule has unit tests. `src/rules/words.ts` holds the word list of the pond.
- `src/rules/vocab.ts` holds the word lists of the orchard. To add a list, add one file in `src/rules/lists` and one line to the registry `RAW_LISTS` in `vocab.ts`. Saved orchards get the new list by themselves.
- `src/art` holds the drawings and the notes of the music.
- `src/ui` shows the game and reads the input.
- `e2e` holds the browser tests.

## Recordings

The voices come from [ElevenLabs](https://elevenlabs.io/). The recordings lie in `public/voice`, so the page needs no key and no server. Do not change them by hand.

After a change to the word lists, run `node scripts/record.ts`. The script records each text that is missing and removes each file that no text needs any more, so a run costs only the new texts. A unit test fails when a recording is missing or left over.

- The script needs a key of ElevenLabs as `ELEVEN_KEY=...` in the file `secret.env`. Git does not see this file. The key needs the right "Text to Speech".
- `node scripts/record.ts --redo Kind` records one text again, when the voice says it wrong. Give the text as it stands in the game.
- At the end the script names the recordings that may be wrong. Listen to them.
- The voices and the model stand at the top of the script.
- `src/rules/clips.ts` lists the texts and gives each file its name, a short hash of the text. A word in syllables has two files in `public/voice/swing`: the sound, and the second where each syllable starts.

## Changes

Each change to `main` goes through a pull request, and the pull request must pass the tests. A merge to `main` publishes the page.
