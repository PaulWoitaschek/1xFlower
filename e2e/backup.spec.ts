import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("a backup carries the profiles to another device", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.locator("#pNewName").fill("Lena");
  await page.getByRole("button", { name: "Profil anlegen" }).click();
  await expect(page.locator("#profiles")).toBeHidden();

  await page.locator("#whoBtn").click();
  await page.getByRole("button", { name: "Profile bearbeiten" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Spielstand sichern" }).click();
  const file = await (await download).path();
  expect(JSON.parse(await readFile(file, "utf8")).profiles[0].name).toBe(
    "Lena",
  );

  const other = await browser.newPage();
  await other.goto("/");
  await expect(other.locator("#pNewForm")).toBeVisible();
  await other.locator("#pFile").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(other.locator("#pMsg")).toHaveText(
    "Diese Datei ist kein Spielstand.",
  );
  await other.locator("#pFile").setInputFiles(file);
  await expect(other.locator("#pMsg")).toHaveText("Ein Profil ist geladen.");
  await expect(other.locator(".pname")).toHaveText(["Lena"]);
  await expect(other.locator("#whoName")).toHaveText("Lena");
  await other.getByRole("button", { name: "Schließen" }).click();
  await expect(other.locator("#profiles")).toBeHidden();
  await other.close();
});
