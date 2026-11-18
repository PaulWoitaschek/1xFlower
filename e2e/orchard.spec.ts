import { expect, test, type Page } from "@playwright/test";
import { freshOrchard } from "../src/rules/orchard";

interface Preload {
  facts?: Record<string, object>;
  own?: string[];
  onlyOwn?: boolean;
  write?: boolean;
}

// A profile in the orchard that asks only the given own words (default: apple).
async function orchardWith(page: Page, preload: Preload = {}) {
  const store = {
    v: 2,
    mode: "orchard",
    sound: false,
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
        orchard: {
          ...freshOrchard(),
          facts: preload.facts ?? {},
          own: preload.own ?? ["apple = Apfel"],
          onlyOwn: preload.onlyOwn ?? true,
          write: preload.write ?? true,
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
  await expect(page.locator("#cue")).toBeVisible();
}

// Types a text on the keyboard of the game: shift before each capital letter.
async function type(page: Page, text: string, submit = true) {
  for (const ch of text) {
    const key = ch === " " ? "space" : ch.toLowerCase();
    if (ch !== ch.toLowerCase()) {
      await page.locator('#keys button[data-k="shift"]').click();
    }
    await page.locator(`#keys button[data-k="${key}"]`).click();
  }
  if (submit) await page.locator('#keys button[data-k="ok"]').click();
}

const tree = (lvl: number) => ({
  lvl,
  seen: lvl,
  right: lvl,
  wrong: 0,
  wilt: false,
  grown: 0,
});

test("the orchard has its own mode button, task and map", async ({ page }) => {
  await page.goto("/");
  await page.locator("#pNewName").fill("Lena");
  await page.getByRole("button", { name: "Profil anlegen" }).click();
  await page.locator("#modeOrchard").click();

  await expect(page.locator("#modeOrchard")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#orchard")).toBeVisible();
  await expect(page.locator("#roundText")).toHaveText("Wort 1 von 10");
  await expect(page.locator("#pad")).toBeHidden();
  await expect(page.locator("#keys")).toBeHidden();
  await expect(page.locator("#opts .opt")).toHaveCount(4);

  await page.reload();
  await expect(page.locator("#modeOrchard")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#opts .opt")).toHaveCount(4);
});

test("a right meaning grows a tree on the map, and it stays after a reload", async ({
  page,
}) => {
  await orchardWith(page);
  await expect(page.locator("body")).toHaveAttribute("data-task", "meaning");
  await expect(page.locator("#cueText")).toHaveText("apple");
  await expect(page.locator("#cuePic")).toBeHidden();
  // a word that is not seen yet has no tree
  await expect(page.locator("#trees .lcell")).toHaveCount(0);

  await page.locator("#opts .opt", { hasText: /^Apfel$/ }).click();

  await expect(page.locator("#fb")).toHaveClass(/good/);
  await expect(page.locator("#fb .pair")).toContainText("apple= Apfel");
  await expect(page.locator("#sPoints")).toHaveText("10");
  await expect(page.locator("#trees .lcell")).toHaveClass(/\bl1\b/);
  await expect(page.locator("#opts .opt.right")).toHaveText("Apfel");

  await page.reload();
  await expect(page.locator("#sPoints")).toHaveText("10");
  await expect(page.locator("#trees .lcell")).toHaveClass(/\bl1\b/);
});

test("the options stay the same while the task is on the screen", async ({
  page,
}) => {
  await orchardWith(page);
  const before = await page.locator("#opts .opt").allTextContents();
  await page.locator("#owrite").click();
  await page.locator("#owrite").click();
  expect(await page.locator("#opts .opt").allTextContents()).toEqual(before);
});

test("a wrong choice shows the pair and the right option, and the word comes back", async ({
  page,
}) => {
  await page.clock.install();
  await orchardWith(page, { facts: { apple: tree(2) } });
  await expect(page.locator("body")).toHaveAttribute("data-task", "choose");
  await expect(page.locator("#cueText")).toHaveText("Apfel");

  await page
    .locator("#opts .opt", { hasText: /^(?!apple$)/ })
    .first()
    .click();

  await expect(page.locator("#fb")).toHaveClass(/bad/);
  await expect(page.locator("#fb .pair")).toContainText("apple= Apfel");
  await expect(page.locator("#opts .opt.right")).toHaveText("apple");
  await expect(page.locator("#opts .opt.wrong")).toHaveCount(1);
  await expect(page.locator("#trees .lcell")).toHaveClass(/\bwilt\b/);

  await page.clock.runFor(3500);
  // the tree is level 0 again, so the word is a meaning task
  await expect(page.locator("body")).toHaveAttribute("data-task", "meaning");
  await expect(page.locator("#cueText")).toHaveText("apple");
  await expect(page.locator("#roundText")).toHaveText("Wort 2 von 10");
});

test("a write task: a wrong first try shows how far it is right, the second try is right", async ({
  page,
}) => {
  await orchardWith(page, { facts: { apple: tree(3) } });
  await expect(page.locator("body")).toHaveAttribute("data-task", "write");
  await expect(page.locator("#keys")).toBeVisible();
  await expect(page.locator("#cueText")).toHaveText("Apfel");

  await type(page, "appel");

  await expect(page.locator("#fb")).toHaveClass(/tip/);
  await expect(page.locator("#fb .sol")).toHaveText("appel");
  await expect(page.locator("#fb .sol b")).toHaveText("el");
  await expect(page.locator("#fb")).not.toContainText("apple");
  await expect(page.locator("#task")).toHaveClass(/again/);
  await expect(page.locator("#sPoints")).toHaveText("0");

  await type(page, "apple");

  await expect(page.locator("#fb")).toContainText("Mit Tipp geschafft!");
  await expect(page.locator("#fb .pair")).toContainText("apple");
  await expect(page.locator("#sPoints")).toHaveText("5");
  await expect(page.locator("#progress i.tip")).toHaveCount(1);
});

test("a wrong capital letter gets a tip about capital letters", async ({
  page,
}) => {
  await orchardWith(page, {
    facts: { Spain: tree(3) },
    own: ["Spain = Spanien"],
  });

  await type(page, "spain");

  await expect(page.locator("#fb")).toHaveClass(/tip/);
  await expect(page.locator("#fb")).toContainText("Großbuchstabe");
  await expect(page.locator("#fb")).not.toContainText("Spain");
});

test("two wrong tries show the solution and ask to copy it", async ({
  page,
}) => {
  await orchardWith(page, { facts: { apple: tree(3) } });

  await type(page, "appel");
  await type(page, "appel");

  await expect(page.locator("#fb")).toHaveClass(/bad/);
  await expect(page.locator("#fb .sol")).toHaveText("apple");
  await expect(page.locator("#trees .lcell")).toHaveClass(/\bwilt\b/);

  await type(page, "app");
  await expect(page.locator("#fb .sol")).toHaveText("apple");
  await expect(page.locator("#word .typed")).toHaveText("");

  await type(page, "apple");
  await expect(page.locator("#fb")).toContainText("Jetzt sitzt es!");
});

test("a phrase with spaces and an apostrophe is typed on the keyboard of the game", async ({
  page,
}) => {
  await orchardWith(page, {
    facts: { "it's a deal": tree(3) },
    own: ["it's a deal = abgemacht"],
  });

  await type(page, "it's", false);
  await page.locator('#keys button[data-k="space"]').click();
  // a second space does not count
  await page.locator('#keys button[data-k="space"]').click();
  await type(page, "a deal", false);
  await expect(page.locator("#word .typed")).toHaveText("it's a deal");
  await page.locator('#keys button[data-k="ok"]').click();

  await expect(page.locator("#fb")).toHaveClass(/good/);
  await expect(page.locator("#sPoints")).toHaveText("10");
});

test("the physical keyboard types the text and the digits choose an option", async ({
  page,
}) => {
  await orchardWith(page, {
    facts: { "go to the park": tree(3) },
    own: ["go to the park = in den Park gehen"],
  });

  await page.locator("#oOwnWords").focus();
  await page.keyboard.type("abc");
  await expect(page.locator("#word .typed")).toHaveText("");
  await page.locator("#oOwnWords").blur();

  await page.keyboard.type("Go to the park");
  await expect(page.locator("#word .typed")).toHaveText("Go to the park");
  await page.keyboard.press("Enter");
  await expect(page.locator("#fb")).toHaveClass(/tip/);
  await expect(page.locator("#fb")).toContainText("zu groß");
});

test("settings: drop a group, the last one stays, own words, only own words", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#pNewName").fill("Lena");
  await page.getByRole("button", { name: "Profil anlegen" }).click();
  await page.locator("#modeOrchard").click();

  const groups = [
    "countries",
    "places",
    "holiday",
    "getting-around",
    "directions",
  ];
  await expect(page.locator(".listname")).toHaveText("Travelling");
  await page.locator("#ogroup-travelling-countries").click();
  await expect(page.locator("#ogroup-travelling-countries")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  const all = await page.locator("#orchardCount").textContent();

  for (const group of groups.slice(1)) {
    await page.locator(`#ogroup-travelling-${group}`).click();
  }
  // the last group stays
  await expect(page.locator("#ogroup-travelling-directions")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.locator("#orchardCount").textContent()).not.toBe(all);

  await page.locator("#owrite").click();
  await expect(page.locator("#owrite")).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.locator("#oOwnWords").fill("apple = Apfel\nnonsense\ntea = Tee");
  await page.locator("#oOwnSave").click();
  await expect(page.locator("#oOwnNote")).toHaveText(
    "2 eigene Wörter genommen.",
  );
  await page.locator("#oOwnOnly").click();
  await expect(page.locator("#oOwnOnly")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#orchardCount")).toContainText("von 2 Bäumen");

  // the round asks only these two words
  for (let i = 0; i < 3; i++) {
    expect(["apple", "tea"]).toContain(
      await page.locator("#cueText").textContent(),
    );
    await page.locator("#opts .opt").first().click();
    await page.locator("#again, #opts").first().waitFor();
    await page.waitForTimeout(100);
    break;
  }

  await page.reload();
  await expect(page.locator("#orchardCount")).toContainText("von 2 Bäumen");
  await expect(page.locator("#oOwnWords")).toHaveValue(
    "apple = Apfel\ntea = Tee",
  );
});

test("a new word from the settings replaces a task that is not asked any more", async ({
  page,
}) => {
  await orchardWith(page, { onlyOwn: false, own: ["apple = Apfel"] });
  await page.locator("#oOwnOnly").click();
  await expect(page.locator("#cueText")).toHaveText("apple");
  await page.locator("#oOwnWords").fill("tea = Tee");
  await page.locator("#oOwnSave").click();
  await expect(page.locator("#cueText")).toHaveText("tea");
});

test("the stars and the parents' sheet list the orchard", async ({ page }) => {
  await orchardWith(page);

  await page
    .locator("#opts .opt", { hasText: /^(?!Apfel$)/ })
    .first()
    .click();
  await expect(page.locator("#fb")).toHaveClass(/bad/);

  await page.locator("#starBtn").click();
  await page.getByText("Für Eltern").click();
  await expect(page.locator(".sread").first()).toContainText("Obstwiese 1");
  await expect(page.locator(".smeter", { hasText: "Obstwiese" })).toContainText(
    "0 von 1",
  );
  await expect(page.locator(".stricky span.c-orchard")).toContainText(
    "apple = Apfel",
  );
  await expect(page.locator(".slegend").first()).toContainText("Obstwiese");
});

test("a round of ten words ends in the summary with the missed words as pairs", async ({
  page,
}) => {
  await page.clock.install();
  await orchardWith(page);

  for (let word = 1; word <= 10; word++) {
    await expect(page.locator("#roundText")).toHaveText(`Wort ${word} von 10`);
    const task = await page.locator("body").getAttribute("data-task");
    if (word === 1) {
      // one wrong choice
      await page
        .locator("#opts .opt", { hasText: /^(?!Apfel$)/ })
        .first()
        .click();
    } else if (task === "write") {
      await type(page, "apple");
    } else {
      const right = task === "meaning" ? /^Apfel$/ : /^apple$/;
      await page.locator("#opts .opt", { hasText: right }).click();
    }
    await page.clock.runFor(3500);
  }

  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumScore")).toContainText("9");
  await expect(page.locator("#sumMiss span")).toHaveText(["apple = Apfel"]);
});
