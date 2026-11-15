# Einmaleins-Garten

A game to practice the multiplication tables. Each task is a plant in a garden, and each right answer makes its plant grow.

The farm practices the division. Each task is a patch of meadow: right answers let the grass grow until it becomes hay. A chick hatches from the egg in the nest, and the chickens eat the hay or the blooms of the garden. To feed a bloom a × b, the child divides a × b by a, and the bloom grows again in the garden, so that the child repeats it. The bud and the bloom each come only on a later day, so a plant blooms only when the child still knows its task on other days. A bloom gets thirsty after some days, and a right answer waters it.

Play it at https://1xflower.woitaschek.de/.

## Development

You need Node.js. CI uses version 26.

- `npm install` installs the tools.
- `npm run dev` starts the page and loads each change at once.
- `npm test` runs the unit tests of the game rules.
- `npm run e2e` builds the page and plays it in a browser. Run `npx playwright install chromium` one time before.
- `npm run typecheck` checks the types.
- `npm run format` formats all files.

## Structure

- `index.html` and `src/style.css` hold the markup and the styles.
- `src/rules` holds the game rules. This code does not use the browser, and each rule has unit tests.
- `src/art` holds the drawings and the notes of the music.
- `src/ui` shows the game and reads the input.
- `e2e` holds the browser tests.

## Changes

Each change to `main` goes through a pull request, and the pull request must pass the tests. A merge to `main` publishes the page.
