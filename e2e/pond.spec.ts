import { expect, test, type Page } from "@playwright/test";
import { dayOf } from "../src/rules/garden";

interface Preload {
  facts?: Record<string, object>;
  own?: string[];
  onlyOwn?: boolean;
  strategies?: string[];
  sound?: boolean;
}

// A profile in the pond that asks only the given own words (default: Hund).
async function pondWith(page: Page, preload: Preload = {}) {
  const store = {
    v: 2,
    mode: "pond",
    sound: preload.sound ?? false,
    music: false,
    haptic: false,
    active: "a",
    profiles: [{ id: "a", name: "Lena", flower: 3 }],
    data: {
      a: {
        facts: {},
        points: 0,
        best: 0,
        rows: [7],
        deco: [],
        critters: [],
        pond: {
          facts: preload.facts ?? {},
          levels: [1],
          strategies: preload.strategies ?? [
            "schwingen",
            "verlaengern",
            "ableiten",
            "merken",
          ],
          own: preload.own ?? ["Hund"],
          onlyOwn: preload.onlyOwn ?? true,
        },
      },
    },
  };
  await page.addInitScript((saved) => {
    // a reload keeps what the game saved
    if (!localStorage.getItem("einmaleins-garten-v2"))
      localStorage.setItem("einmaleins-garten-v2", saved);
  }, JSON.stringify(store));
  await page.goto("/");
  await expect(page.locator("#keys")).toBeVisible();
}

// Types a word on the keyboard of the game: shift before each capital letter.
async function type(page: Page, text: string, submit = true) {
  for (const ch of text) {
    if (ch !== ch.toLowerCase()) {
      await page.locator('#keys button[data-k="shift"]').click();
    }
    await page.locator(`#keys button[data-k="${ch.toLowerCase()}"]`).click();
  }
  if (submit) await page.locator('#keys button[data-k="ok"]').click();
}

const lily = { lvl: 1, seen: 1, right: 1, wrong: 0, wilt: false, grown: 0 };

test("the pond shows the cue and the keyboard and stays after a reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#pNewName").fill("Lena");
  await page.getByRole("button", { name: "Profil anlegen" }).click();
  await page.locator("#modePond").click();

  await expect(page.locator("#modePond")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#cue")).toBeVisible();
  await expect(page.locator("#keys")).toBeVisible();
  await expect(page.locator("#roundText")).toHaveText("Wort 1 von 10");
  await expect(page.locator("#pad")).toBeHidden();
  await expect(page.locator(".eq")).toBeHidden();

  await page.reload();
  await expect(page.locator("#modePond")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#keys")).toBeVisible();
  await expect(page.locator("#pad")).toBeHidden();
});

test("a right word grows the lily and the lily stays after a reload", async ({
  page,
}) => {
  await pondWith(page);
  await expect(page.locator("#cueText")).toHaveText("Der ___ bellt laut.");

  await type(page, "Hund");

  await expect(page.locator("#fb")).toHaveClass(/good/);
  await expect(page.locator("#sPoints")).toHaveText("10");
  await expect(page.locator("#sStreak")).toHaveText("1");
  await expect(page.locator("#lilies .lcell")).toHaveClass(/\bl1\b/);

  await page.reload();
  await expect(page.locator("#sPoints")).toHaveText("10");
  await expect(page.locator("#lilies .lcell")).toHaveClass(/\bl1\b/);
});

test("a wrong first try gets the tip with lengthening, and the second try is right", async ({
  page,
}) => {
  await pondWith(page);

  await type(page, "Hunt");

  await expect(page.locator("#fb")).toHaveClass(/tip/);
  await expect(page.locator("#fb")).toContainText("Verlängern");
  await expect(page.locator("#fb .syl")).toHaveText(["Hun", "de"]);
  await expect(page.locator("#task")).toHaveClass(/again/);
  await expect(page.locator("#sPoints")).toHaveText("0");

  await type(page, "Hund");

  await expect(page.locator("#fb")).toContainText("Mit Tipp geschafft!");
  await expect(page.locator("#sPoints")).toHaveText("5");
  await expect(page.locator("#sStreak")).toHaveText("0");
  await expect(page.locator("#progress i.tip")).toHaveCount(1);
});

test("two wrong tries show the solution and ask to copy the word", async ({
  page,
}) => {
  await pondWith(page);

  await type(page, "Hunt");
  await type(page, "Hunt");

  await expect(page.locator("#fb")).toHaveClass(/bad/);
  await expect(page.locator("#fb .sol")).toHaveText("Hund");
  await expect(page.locator("#fb .sol b")).toHaveText("d");
  await expect(page.locator("#lilies .lcell")).toHaveClass(/\bwilt\b/);

  await type(page, "Hun");
  await expect(page.locator("#fb .sol")).toHaveText("Hund");
  await expect(page.locator("#word .typed")).toHaveText("");

  await type(page, "Hund");
  await expect(page.locator("#fb")).toContainText("Jetzt sitzt es!");
});

test("a small first letter gets the tip about capital letters", async ({
  page,
}) => {
  await pondWith(page);

  await type(page, "hund");

  await expect(page.locator("#fb")).toHaveClass(/tip/);
  await expect(page.locator("#fb")).toContainText(
    "Dieses Wort schreibt man groß.",
  );
});

test("a word with a missing letter gets the swinging with a bow for each syllable", async ({
  page,
}) => {
  await pondWith(page, { own: ["To-ma-te"] });

  await type(page, "Tomte");

  await expect(page.locator("#fb")).toHaveClass(/tip/);
  await expect(page.locator("#fb")).toContainText("Schwingen");
  await expect(page.locator("#swing .bow")).toHaveCount(3);
  await expect(page.locator("#swing .bow").nth(1)).toHaveClass(/\bhere\b/);
  // the frog hops over the bows
  await expect(page.locator("#swing .frog")).toHaveClass(/\bon\b/);
});

test("the recorded voice says a word of the game and its sentence", async ({
  page,
}) => {
  const word = page.waitForResponse(/audio\/de\/hund-\w+\.mp3$/);
  const sentence = page.waitForResponse(
    /audio\/de\/der-hund-bellt-laut-\w+\.mp3$/,
  );
  await pondWith(page, { sound: true });

  expect((await word).ok()).toBe(true);
  expect((await sentence).ok()).toBe(true);
});

test("the recorded voice swings a word of the game, and the frog hops along", async ({
  page,
}) => {
  const sound = page.waitForResponse(/audio\/de\/to-ma-te-\w+\.mp3$/);
  const starts = page.waitForResponse(/audio\/de\/to-ma-te-\w+\.json$/);
  await pondWith(page, { own: ["To-ma-te"], sound: true });

  await type(page, "Tomte");

  expect((await sound).ok()).toBe(true);
  expect(await (await starts).json()).toHaveLength(3);
  // the frog reaches the last syllable
  await expect(page.locator("#swing .bow").nth(2)).toHaveClass(/\bsung\b/);
});

test("a word to remember flashes, the keys wait, and then the child writes it", async ({
  page,
}) => {
  await page.clock.install();
  await pondWith(page, { own: ["Vogel"] });

  await type(page, "Fogel");

  await expect(page.locator("#word")).toHaveClass(/\bflash\b/);
  await expect(page.locator("#word")).toHaveText("Vogel");
  await page.locator('#keys button[data-k="a"]').click();
  await expect(page.locator("#word")).toHaveText("Vogel");
  await expect(page.locator("#task")).toHaveClass(/again/);

  await page.clock.runFor(2700);
  await expect(page.locator("#word")).not.toHaveClass(/\bflash\b/);
  await expect(page.locator("#word .typed")).toHaveText("");

  await type(page, "Vogel");
  await expect(page.locator("#fb")).toContainText("Mit Tipp geschafft!");
});

test("a word with a related word gets the deriving tip", async ({ page }) => {
  await pondWith(page, { own: ["Häuser"] });

  await type(page, "Heuser");

  await expect(page.locator("#fb")).toHaveClass(/tip/);
  await expect(page.locator("#fb")).toContainText("Ableiten");
  await expect(page.locator("#fb")).toContainText("Haus");
});

test("own words are saved, can be asked alone, and an unknown word has no sentence", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#pNewName").fill("Lena");
  await page.getByRole("button", { name: "Profil anlegen" }).click();
  await page.locator("#modePond").click();

  await page.locator("#ownWords").fill("Hund\nSpiel-platz");
  await page.locator("#ownSave").click();
  await expect(page.locator("#ownNote")).toHaveText("2 Lernwörter im Teich.");
  await page.locator("#ownOnly").click();
  await expect(page.locator("#ownOnly")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // the pond asks only these two words, so the unknown one comes soon
  for (let i = 0; i < 8; i++) {
    const cue = await page.locator("#cueText").textContent();
    if (cue === "Hör genau hin!") return;
    expect(cue).toBe("Der ___ bellt laut.");
    await type(page, "Hund");
    await expect(page.locator("#fb")).toHaveClass(/good/);
    await expect(page.locator("#roundText")).toHaveText(`Wort ${i + 2} von 10`);
    await expect(page.locator("#task")).not.toHaveClass(/\bok\b/);
  }
  expect(await page.locator("#cueText").textContent()).toBe("Hör genau hin!");
});

test("the physical keyboard types the word, but not inside the text field", async ({
  page,
}) => {
  await pondWith(page);

  await page.locator("#ownWords").focus();
  await page.keyboard.type("abc");
  await expect(page.locator("#word .typed")).toHaveText("");
  await page.locator("#ownWords").blur();

  await page.keyboard.type("Hund");
  await expect(page.locator("#word .typed")).toHaveText("Hund");
  await page.keyboard.press("Enter");

  await expect(page.locator("#fb")).toHaveClass(/good/);
  await expect(page.locator("#sPoints")).toHaveText("10");
});

test("the last chosen strategy cannot be switched off", async ({ page }) => {
  await pondWith(page);

  for (const name of ["schwingen", "verlaengern", "ableiten"]) {
    await page.locator(`#pstrategy${name}`).click();
    await expect(page.locator(`#pstrategy${name}`)).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  }
  await page.locator("#pstrategymerken").click();

  await expect(page.locator("#pstrategymerken")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a lily blooms on a later day, and the second open lily brings the frog", async ({
  page,
}) => {
  const now = new Date(2026, 10, 14, 16, 0);
  await page.clock.install({ time: now });
  const today = dayOf(now.getTime());
  await pondWith(page, {
    facts: {
      Hund: {
        lvl: 3,
        seen: 3,
        right: 3,
        wrong: 0,
        wilt: false,
        grown: today - 1,
      },
      Ball: {
        lvl: 4,
        seen: 4,
        right: 4,
        wrong: 0,
        wilt: false,
        grown: today - 3,
        watered: today,
        gap: 0,
      },
    },
  });

  await type(page, "Hund");

  await expect(page.locator("#fb")).toContainText("Frosch zieht an den Teich!");
  await expect(page.locator("#lilies .lcell").first()).toBeVisible();
  await expect(page.locator("#residents .gift.got")).toHaveCount(1);
});

test("a round of ten words ends in the summary", async ({ page }) => {
  await page.clock.install();
  const today = dayOf(Date.now());
  await pondWith(page, {
    facts: {
      Hund: { ...lily, lvl: 4, watered: today, grown: today, gap: 0 },
    },
  });

  for (let word = 1; word <= 10; word++) {
    await expect(page.locator("#roundText")).toHaveText(`Wort ${word} von 10`);
    await type(page, "Hund");
    await expect(page.locator("#fb")).toHaveClass(/good/);
    await page.clock.runFor(3000);
  }

  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumScore")).toHaveText("10 / 10");
  await expect(page.locator("#sumGarden")).toContainText(
    "1 von 1 Seerosen blühen.",
  );
});
