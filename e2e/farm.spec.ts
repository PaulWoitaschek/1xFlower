import { expect, test, type Page } from "@playwright/test";

async function divide(page: Page, right = true) {
  await expect(page.locator("#qop")).toHaveText(":");
  const dividend = Number(await page.locator("#qa").textContent());
  const divisor = Number(await page.locator("#qb").textContent());
  const quotient = dividend / divisor;
  for (const digit of String(right ? quotient : quotient + 1)) {
    await page.locator(`#pad button[data-k="${digit}"]`).click();
  }
  await page.locator('#pad button[data-k="ok"]').click();
  return { dividend, divisor, quotient };
}

const patch = (page: Page, dividend: number, divisor: number) =>
  page.locator(`#fgrid .cell[title="${dividend} : ${divisor}"]`);

const chick = { id: "c", color: 1, grown: false, meals: 0 };

// A profile on the farm with a chick, the given eggs and hay, and the given blooms in the garden.
async function farmWith(
  page: Page,
  farm: { hay: number; eggs: { id: string; warmth: number }[] },
  blooms: string[] = [],
) {
  const bloom = { lvl: 4, seen: 4, right: 4, wrong: 0, wilt: false, grown: 0 };
  const facts = Object.fromEntries(blooms.map((key) => [key, bloom]));
  const store = {
    v: 2,
    mode: "farm",
    sound: false,
    music: false,
    haptic: false,
    active: "a",
    profiles: [{ id: "a", name: "Lena", flower: 3 }],
    data: {
      a: {
        facts,
        points: 0,
        best: 0,
        rows: [7],
        deco: [],
        critters: [],
        farm: { facts: {}, rows: [2], chickens: [chick], ...farm },
      },
    },
  };
  await page.addInitScript((saved) => {
    localStorage.setItem("einmaleins-garten-v2", saved);
  }, JSON.stringify(store));
  await page.goto("/");
}

test("the farm asks divisions, and a right answer grows the grass", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#pNewName").fill("Lena");
  await page.getByRole("button", { name: "Profil anlegen" }).click();
  await page.locator("#modeFarm").click();

  await expect(page.locator("#modeFarm")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#fb")).toContainText(
    "Noch 6 richtige Antworten, dann schlüpft ein Küken!",
  );
  const { dividend, divisor } = await divide(page);

  expect([2, 5, 10]).toContain(divisor);
  await expect(page.locator("#fb")).toHaveClass(/good/);
  await expect(patch(page, dividend, divisor)).toHaveClass(/\bl1\b/);
  await expect(page.locator("#fCount")).toContainText("2 Heu in der Scheune");

  await page.reload();
  await expect(page.locator("#modeFarm")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(patch(page, dividend, divisor)).toHaveClass(/\bl1\b/);
});

test("a wrong division dries the grass and asks for the right answer", async ({
  page,
}) => {
  await farmWith(page, { hay: 0, eggs: [] });

  const { dividend, divisor, quotient } = await divide(page, false);

  await expect(page.locator("#fb")).toContainText(
    `${dividend} : ${divisor} = ${quotient}`,
  );
  await expect(patch(page, dividend, divisor)).toHaveClass(/wilt/);
});

test("a warm egg hatches a chick", async ({ page }) => {
  await farmWith(page, { hay: 0, eggs: [{ id: "e", warmth: 5 }] });
  await expect(page.locator("#fb")).toContainText(
    "Noch 1 richtige Antwort, dann schlüpft ein Küken!",
  );

  await divide(page);

  await expect(page.locator("#fb")).toContainText("Ein Küken ist geschlüpft!");
  await expect(page.locator(".bird")).toHaveCount(2);
  await expect(page.locator(".nest")).toContainText("Das Nest ist leer");
});

test("a chick eats hay from the barn", async ({ page }) => {
  await farmWith(page, { hay: 2, eggs: [] });

  await page.locator(".bird").click();
  await expect(page.locator("#feedTitle")).toHaveText("Was frisst dein Küken?");
  await page.locator("#feedHay").click();

  await expect(page.locator("#feed")).toBeHidden();
  await expect(page.locator("#fNote")).toContainText(
    "Noch 2 Mal füttern, dann ist es groß.",
  );
  await expect(page.locator("#fCount")).toContainText("1 Heu in der Scheune");
  await expect(page.locator(".bird .meals .on")).toHaveCount(1);
});

test("a chick eats a bloom when the child knows its division", async ({
  page,
}) => {
  await farmWith(page, { hay: 0, eggs: [] }, ["7x8"]);

  await page.locator(".bird").click();
  await expect(page.locator("#feedHay")).toBeDisabled();
  await page.getByRole("button", { name: "Blume aus der 7er-Reihe" }).click();

  await expect(page.locator("#qa")).toHaveText("56");
  await expect(page.locator("#qb")).toHaveText("7");
  await expect(page.locator("#fb")).toContainText(
    "Dann frisst dein Küken die Blume.",
  );
  await divide(page);

  await expect(page.locator("#fb")).toContainText(
    "Die Blume wächst im Garten neu.",
  );
  await expect(page.locator(".bird .meals .on")).toHaveCount(1);
  await page.locator("#modeGarden").click();
  await expect(page.locator('.cell[title="7 × 8"]')).toHaveClass(/\bl2\b/);
});

test("a wrong division keeps the bloom in the garden", async ({ page }) => {
  await farmWith(page, { hay: 0, eggs: [] }, ["7x8"]);

  await page.locator(".bird").click();
  await page.getByRole("button", { name: "Blume aus der 7er-Reihe" }).click();
  await divide(page, false);

  await expect(page.locator("#fb")).toContainText(
    "Die Blume bleibt im Garten.",
  );
  await expect(page.locator(".bird .meals .on")).toHaveCount(0);
  await page.locator("#modeGarden").click();
  await expect(page.locator('.cell[title="7 × 8"]')).toHaveClass(/\bl4\b/);
});
