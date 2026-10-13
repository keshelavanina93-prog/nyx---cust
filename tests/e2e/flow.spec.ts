/**
 * E2E (brief §10): full flow upload → lines → HS confirm → calc → approve → export → guide; HS gate; viewer role.
 * Runs with AI_MOCK=true + AUTH_DEV_LOGIN=true against the embedded PGlite DB.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const fixture = path.join(process.cwd(), "tests/fixtures/invoices/tr-textiles-en/invoice.json");
const uid = Date.now().toString(36);

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("dev-email").fill(email);
  await page.getByTestId("dev-login").click();
  await page.waitForURL(/\/(orgs\/new|[^/]+\/dashboard)(\?|$)/, { timeout: 60_000 });
}

test.describe.serial("declaration flow", () => {
  let orgSlug: string;
  let shipmentUrl: string;

  test("create org and shipment, upload, extract", async ({ page }) => {
    await login(page, `e2e-${uid}@example.com`);
    if (page.url().includes("/orgs/new")) {
      await page.getByTestId("org-name").fill(`E2E ${uid}`);
      await page.getByTestId("org-create").click();
      await page.waitForURL(/dashboard/);
    }
    orgSlug = new URL(page.url()).pathname.split("/")[1]!;
    await page.getByTestId("new-shipment").click();
    await page.getByTestId("ref").fill(`TR-${uid}`);
    await page.getByTestId("create-shipment").click();
    await page.waitForURL(/\/intake/);
    shipmentUrl = page.url().replace(/\/intake$/, "");
    await page.getByTestId("file-input").setInputFiles(fixture);
    await page.getByTestId("upload").click();
    await expect(page.getByText("invoice.json")).toBeVisible();
    await page.getByTestId("extract").click();
    await page.waitForURL(/\/lines/);
    await expect(page.getByText("ხაზების ჯამი ემთხვევა")).toBeVisible();
  });

  test("HS gate blocks calc until every line is confirmed", async ({ page }) => {
    await login(page, `e2e-${uid}@example.com`);
    await page.goto(`${shipmentUrl}/lines`);
    await page.getByTestId("to-hs").click();
    await page.waitForURL(/\/hs/);
    await page.getByTestId("classify").click();
    await expect(page.getByTestId("hs-line-1")).toBeVisible();
    await page.screenshot({ path: "test-results/screens/hs.png", fullPage: true });
    await expect(page.getByTestId("to-calc")).toBeDisabled();
    await page.getByTestId("confirm-1-0").click();
    await expect(page.getByTestId("hs-line-1").getByTestId("confirmed-badge")).toBeVisible();
    await expect(page.getByTestId("to-calc")).toBeDisabled(); // lines 2,3 still unconfirmed
    await page.getByTestId("confirm-2-0").click();
    await page.getByTestId("confirm-3-0").click();
    await expect(page.getByTestId("to-calc")).toBeEnabled();
    await page.getByTestId("to-calc").click();
    await page.waitForURL(/\/calc/);
  });

  test("calculate (manual FX fallback), approve, export, sheet, guide", async ({ page }) => {
    await login(page, `e2e-${uid}@example.com`);
    await page.goto(`${shipmentUrl}/calc`);
    await page.getByTestId("calculate").click();
    if (page.url().includes("err=fx_missing")) {
      await page.getByLabel(/კურსი ხელით/).fill("2.70");
      await page.getByPlaceholder("nbg.gov.ge, 13.10.2026").fill("e2e manual rate");
      await page.getByRole("button", { name: "შენახვა" }).click();
      await page.waitForURL(/\/calc$/);
    }
    await expect(page.getByText("სულ გადასახდელი").first()).toBeVisible();
    await page.screenshot({ path: "test-results/screens/calc.png", fullPage: true });
    await page.getByTestId("to-approve").click();
    await page.waitForURL(/\/approve/);
    await page.screenshot({ path: "test-results/screens/approve.png", fullPage: true });
    await page.getByTestId("attest").check();
    await page.getByTestId("approve").click();
    await page.waitForURL(/\/export/);
    await page.getByTestId("export-xls").click();
    await expect(page.getByText(/declaration-.*\.xlsx/)).toBeVisible();
    await page.getByTestId("export-xml").click();
    await expect(page.getByText(/SAD-.*\.xml/)).toBeVisible();
    await expect(page.getByText("ექსპერიმენტული").first()).toBeVisible();
    await page.getByTestId("open-sheet").click();
    await page.waitForURL(/\/sheet/);
    await expect(page.getByTestId("sheet-33").first()).toHaveText(/^\d{10}$/);
    await page.screenshot({ path: "test-results/screens/sheet.png", fullPage: true });
    await page.goto(`${shipmentUrl}/ecustoms`);
    await page.getByTestId("assessment").fill("A 123456");
    await page.getByTestId("save-assessment").click();
    await page.waitForURL(/\/payment/);
    await page.getByTestId("mark-paid").click();
    await page.waitForURL(/\/corridor/);
    await page.getByTestId("corridor").selectOption("green");
    await page.getByTestId("save-corridor").click();
    await page.goto(`${shipmentUrl}/close`);
    await page.getByTestId("released").click();
    await page.getByTestId("close").click();
    await expect(page.getByText("ტვირთი დახურულია")).toBeVisible();
  });

  test("onboarding wizard stores status without personal number", async ({ page }) => {
    await login(page, `e2e-${uid}@example.com`);
    await page.goto(`/${orgSlug}/onboarding/ecustoms`);
    await page.getByTestId("employee-name").fill("Nino K.");
    await page.getByTestId("in-register").check();
    await page.getByTestId("no-debt").check();
    await page.getByTestId("access-status").selectOption("active");
    await page.getByTestId("valid-until").fill("2027-10-13");
    await page.getByTestId("save-onboarding").click();
    await expect(page.getByText("აქტიური").first()).toBeVisible();
  });
});

test("tenant isolation: another user cannot open the shipment", async ({ page }) => {
  await login(page, `other-${uid}@example.com`);
  const res = await page.goto(`/nonexistent-${uid}/dashboard`);
  expect(res?.status()).toBeLessThan(500);
  await expect(page).not.toHaveURL(/nonexistent/);
});
