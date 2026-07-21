import { expect, test } from "@playwright/test";

/**
 * Minimal smoke suite for local mode (no Supabase env).
 * Assertions stay loose so copy/layout tweaks do not flake CI.
 */
test.describe("smoke (local mode)", () => {
  test("home loads with scouting shell", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#app-main")).toBeVisible();
    await expect(
      page.getByText(/Scouting|Willkommen|Arbeitsplatz|Übersicht/i).first()
    ).toBeVisible();

    const skipLink = page.locator('a[href="#app-main"]');
    await expect(skipLink).toHaveCount(1);
  });

  test("login shows local-mode or Anmelden", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page
        .getByText(
          /Anmelden|Supabase ist noch nicht konfiguriert|Fussball Scouting/i
        )
        .first()
    ).toBeVisible();
  });

  test("hilfe page is reachable", async ({ page }) => {
    await page.goto("/hilfe");

    await expect(page.getByText(/Hilfe/i).first()).toBeVisible();
    await expect(page.locator("#app-main")).toBeVisible();
  });
});
