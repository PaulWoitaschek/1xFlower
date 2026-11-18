import { expect, test, type Page } from "@playwright/test";

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
}

test("ten tasks of a day bring a star", async ({ page }) => {
  await page.clock.install();
  await newProfile(page);
  await expect(page.locator("#sStars")).toHaveText("0");

  for (let task = 1; task <= 10; task++) {
    await expect(page.locator("#roundText")).toHaveText(
      `Aufgabe ${task} von 20`,
    );
    await answer(page, task !== 3);
    if (task === 3) await answer(page);
    await page.clock.runFor(3000);
  }

  await expect(page.locator("#sStars")).toHaveText("1");
  await page.locator("#starBtn").click();
  await expect(page.locator("#starTitle")).toHaveText("Sterne von Lena");
  await expect(page.locator(".sday.now .stars .on")).toHaveCount(1);
  await expect(page.locator(".shero")).toContainText(
    "Noch 20 Aufgaben bis zum nächsten Stern heute.",
  );

  await page.getByText("Für Eltern").click();
  await expect(page.locator(".stile").nth(1)).toContainText("10");
  await expect(page.locator(".stile").nth(2)).toContainText("90 %");
  await expect(page.locator(".sread").first()).toContainText(
    "Heute: 10 Aufgaben (Garten 10)",
  );
  await expect(page.locator(".stricky span")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(page.locator("#stars")).toBeHidden();

  await page.reload();
  await expect(page.locator("#sStars")).toHaveText("1");
});

test("the parents see a note before the first day of practice", async ({
  page,
}) => {
  await newProfile(page);
  await page.locator("#starBtn").click();
  await expect(page.locator(".shero")).toContainText(
    "Noch 10 Aufgaben bis zum ersten Stern heute.",
  );
  await page.getByText("Für Eltern").click();
  await expect(page.locator(".spinner")).toContainText(
    "Hier erscheint der Verlauf",
  );
  await page.locator("#starClose").click();
  await expect(page.locator("#stars")).toBeHidden();
});
