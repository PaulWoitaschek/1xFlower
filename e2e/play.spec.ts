import { expect, test, type Page } from "@playwright/test";
import { dayOf } from "../src/rules/garden";

async function newProfile(page: Page) {
  await page.goto("/");
  await page.locator("#pNewName").fill("Lena");
  await page.getByRole("button", { name: "Profil anlegen" }).click();
  await expect(page.locator("#profiles")).toBeHidden();
}

async function answer(page: Page, right = true) {
  const a = Number(await page.locator("#qa").textContent());
  const b = Number(await page.locator("#qb").textContent());
  for (const digit of String(right ? a * b : a * b + 1)) {
    await page.locator(`#pad button[data-k="${digit}"]`).click();
  }
  await page.locator('#pad button[data-k="ok"]').click();
  return { a, b };
}

const gardenPlant = (page: Page, a: number, b: number) =>
  page.locator(`.cell[title="${a} × ${b}"]`);
const mapPlant = (page: Page, a: number, b: number) =>
  page.locator("#map i").nth((a - 1) * 11 + b - 1);

test("a right answer grows the plant in the garden and on the map", async ({
  page,
}) => {
  await newProfile(page);
  await expect(page.locator("#mapCap")).toHaveText("0 von 100 blühen");

  const { a, b } = await answer(page);

  await expect(page.locator("#fb")).toHaveClass(/good/);
  await expect(page.locator("#sStreak")).toHaveText("1");
  await expect(page.locator("#sPoints")).toHaveText("15");
  await expect(gardenPlant(page, a, b)).toHaveClass(/\bl1\b/);
  await expect(mapPlant(page, a, b)).toHaveClass(/\bl1\b/);
  await expect(page.locator("#roundText")).toHaveText("Aufgabe 2 von 20");
});

test("a wrong answer wilts the plant and asks for the right answer", async ({
  page,
}) => {
  await newProfile(page);

  const { a, b } = await answer(page, false);

  await expect(page.locator("#fb")).toHaveClass(/bad/);
  await expect(page.locator("#fb")).toContainText(`${a} × ${b} = ${a * b}`);
  await expect(page.locator("#task")).toHaveClass(/shake/);
  await expect(gardenPlant(page, a, b)).toHaveClass(/wilt/);
  await expect(page.locator("#sStreak")).toHaveText("0");

  await answer(page);

  await expect(page.locator("#fb")).toContainText("Jetzt sitzt es!");
  await expect(page.locator("#roundText")).toHaveText("Aufgabe 2 von 20");
});

test("a round ends in the summary and the garden stays after a reload", async ({
  page,
}) => {
  await page.clock.install();
  await newProfile(page);

  for (let task = 1; task <= 20; task++) {
    await expect(page.locator("#roundText")).toHaveText(
      `Aufgabe ${task} von 20`,
    );
    await answer(page);
    await page.clock.runFor(3000);
  }

  await expect(page.locator("#summary")).toBeVisible();
  await expect(page.locator("#sumScore")).toHaveText("20 / 20");
  const points = await page.locator("#sPoints").textContent();

  await page.locator("#toGarden").click();
  await expect(page.locator("#summary")).toBeHidden();
  await expect(page.locator("#grid")).toBeInViewport();
  await expect(page.locator("#gCount")).toContainText("4 Tiere");

  await page.reload();
  await expect(page.locator("#profiles")).toBeHidden();
  await expect(page.locator("#whoName")).toHaveText("Lena");
  await expect(page.locator("#sPoints")).toHaveText(points!);
  await expect(page.locator("#gCount")).toContainText("4 Tiere");
});

test("the third bloom brings a gift", async ({ page }) => {
  const bloom = { lvl: 4, seen: 4, right: 4, wrong: 0, wilt: false };
  const bud = { ...bloom, lvl: 3, seen: 3, right: 3 };
  const facts: Record<string, typeof bloom> = { "1x1": bloom, "1x2": bloom };
  for (let b = 1; b <= 10; b++) facts[`3x${b}`] = bud;
  const store = {
    v: 2,
    sound: false,
    haptic: false,
    active: "a",
    profiles: [{ id: "a", name: "Lena", flower: 3 }],
    data: {
      a: { facts, points: 0, best: 0, rows: [3], deco: [], critters: [] },
    },
  };
  await page.addInitScript((saved) => {
    localStorage.setItem("einmaleins-garten-v2", saved);
  }, JSON.stringify(store));
  await page.goto("/");
  await expect(page.locator("#fb")).toContainText(
    "Noch 1 Blüte bis zum Geschenk",
  );

  await answer(page);

  await expect(page.locator("#fb")).toContainText("Geschenk: Gießkanne!");
  await expect(page.locator("#mapCap")).toHaveText("3 von 100 blühen");
  await expect(page.locator('#yard [title="Gießkanne"]')).toBeVisible();
  await expect(page.locator("#gifts .got")).toHaveCount(1);
});

test("a new garden starts with seeds only and shows no legend", async ({
  page,
}) => {
  await newProfile(page);

  await expect(page.locator("#grid .cell")).toHaveCount(100);
  await expect(page.locator("#grid .cell.u")).toHaveCount(100);
  await expect(page.locator("#life .guest")).toHaveCount(0);
  await expect(page.locator("#legend")).toHaveCount(0);
  await expect(page.locator("#garden")).not.toContainText("welkt");
});

test("the blooms next to a new bloom greet it and a new bee comes", async ({
  page,
}) => {
  const bloom = { lvl: 4, seen: 4, right: 4, wrong: 0, wilt: false };
  const bud = { ...bloom, lvl: 3, seen: 3, right: 3 };
  const facts: Record<string, typeof bloom> = {};
  for (let b = 1; b <= 10; b++) {
    facts[`4x${b}`] = bloom;
    facts[`5x${b}`] = bud;
    facts[`6x${b}`] = bloom;
  }
  const store = {
    v: 2,
    sound: false,
    haptic: false,
    active: "a",
    profiles: [{ id: "a", name: "Lena", flower: 3 }],
    data: {
      a: { facts, points: 0, best: 0, rows: [5], deco: [], critters: [] },
    },
  };
  await page.addInitScript((saved) => {
    localStorage.setItem("einmaleins-garten-v2", saved);
  }, JSON.stringify(store));
  await page.goto("/");
  await expect(page.locator("#life .guest.bee")).toHaveCount(4);

  const { a, b } = await answer(page);

  await expect(gardenPlant(page, a, b)).toHaveClass(/bloomed/);
  await expect(gardenPlant(page, a - 1, b)).toHaveClass(/hello/);
  await expect(gardenPlant(page, a + 1, b)).toHaveClass(/hello/);
  await expect(page.locator("#life .guest.bee")).toHaveCount(5);
  await expect(page.locator(".flyer").first()).toBeAttached();
});

test("a bud that grew today blooms only on a later day", async ({ page }) => {
  const today = new Date(2026, 10, 14, 16, 0);
  await page.clock.install({ time: today });
  const bud = {
    lvl: 3,
    seen: 3,
    right: 3,
    wrong: 0,
    wilt: false,
    grown: dayOf(today.getTime()),
  };
  const facts: Record<string, typeof bud> = {};
  for (let b = 1; b <= 10; b++) facts[`3x${b}`] = bud;
  const store = {
    v: 2,
    sound: false,
    haptic: false,
    active: "a",
    profiles: [{ id: "a", name: "Lena", flower: 3 }],
    data: {
      a: { facts, points: 0, best: 0, rows: [3], deco: [], critters: [] },
    },
  };
  await page.addInitScript((saved) => {
    localStorage.setItem("einmaleins-garten-v2", saved);
  }, JSON.stringify(store));
  await page.goto("/");

  const first = await answer(page);

  await expect(page.locator("#fb")).toContainText("Morgen kann sie blühen!");
  await expect(page.locator("#hero .tag")).toHaveText("Ruht bis morgen");
  await expect(gardenPlant(page, first.a, first.b)).toHaveClass(/\bl3\b/);
  await expect(page.locator("#mapCap")).toHaveText("0 von 100 blühen");

  await page.clock.runFor(3000);
  await page.clock.setSystemTime(new Date(2026, 10, 15, 16, 0));
  const second = await answer(page);

  await expect(page.locator("#fb")).toContainText("Neue Blüte!");
  await expect(gardenPlant(page, second.a, second.b)).toHaveClass(/\bl4\b/);
  await expect(page.locator("#mapCap")).toHaveText("1 von 100 blühen");
});
