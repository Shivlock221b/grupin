import { expect, type Page, test } from "@playwright/test";

const dealId = "00000000-0000-0000-0000-000000000101";
const existingPhone = "8766239058";
const joinedKey = `grupin-joined-${dealId}`;
const joinedPhoneKey = `grupin-joined-phone-${dealId}`;

async function gotoPage(page: Page, path: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "commit", timeout: 15_000 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }

      await page.waitForTimeout(750);
    }
  }
}

test.describe("buyer deal flow", () => {
  test("renders the buyer flow, sanitizes public data, and returns from reward claim", async ({ page, request }) => {
    const response = await request.get(`/api/reservations?dealId=${dealId}&phone=${existingPhone}`);
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload.joined).toBe(true);
    expect(payload.deal.id).toBe(dealId);
    expect(payload.reservations.length).toBeGreaterThan(0);

    for (const reservation of payload.reservations) {
      expect(reservation.name).toBeTruthy();
      expect(reservation.phone).toBe("");
      expect(reservation.email).toBe("");
      expect(reservation.razorpayPaymentId).toBe("");
    }

    await gotoPage(page, `/deal/${dealId}`);

    await expect(page.getByText("Antinorm Combo").first()).toBeVisible();
    await expect(page.getByText(/20\s*\/\s*30\s*buyers joined/i)).toBeVisible();
    await expect(page.getByText("Live squad feed")).toBeVisible();
    await expect(page.getByRole("link", { name: "View product on brand site" })).toBeVisible();
    const countdownCard = page.locator("div").filter({ hasText: "Reward window ends in:" }).last();
    await expect(countdownCard.getByText(/\d{2}:\d{2}:\d{2}/)).toBeVisible();

    await page.evaluate(
      ({ joinedKey: key, joinedPhoneKey: phoneKey }) => {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(phoneKey);
      },
      { joinedKey, joinedPhoneKey }
    );

    await page.getByRole("button", { name: /join the unlock for ₹99/i }).click();

    await page.getByLabel("Name").fill("Existing Buyer");
    await page.getByLabel("Phone").fill(existingPhone);
    await page.getByLabel("Email").fill("existing@example.com");
    await page.getByRole("button", { name: /send sms otp/i }).click();

    await expect(page.getByText("You have already joined this unlock").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /claim reward/i }).first()).toBeVisible();

    const storage = await page.evaluate(
      ({ joinedKey: key, joinedPhoneKey: phoneKey }) => ({
        joined: window.localStorage.getItem(key),
        phone: window.localStorage.getItem(phoneKey),
      }),
      { joinedKey, joinedPhoneKey }
    );
    expect(storage).toEqual({ joined: "true", phone: existingPhone });

    await page.getByRole("link", { name: /claim reward/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/complete-purchase/${dealId}`));

    await page.getByLabel("Registered mobile number").fill("12");
    await page.getByRole("button", { name: /send sms otp/i }).click();

    await expect(page.getByText("Enter a valid phone number.")).toBeVisible();

    await page.goBack({ waitUntil: "commit" });
    await expect(page).toHaveURL(new RegExp(`/deal/${dealId}`));
    await expect(page.getByRole("link", { name: /claim reward/i }).first()).toBeVisible();
  });

  test("invalid deal ids return not found instead of crashing", async ({ request }) => {
    const apiResponse = await request.get("/api/reservations?dealId=not-a-real-deal");
    expect(apiResponse.status()).toBe(404);

    const dealResponse = await request.get("/deal/not-a-real-deal");
    expect(dealResponse.status()).toBe(404);

    const completePurchaseResponse = await request.get("/complete-purchase/not-a-real-deal");
    expect(completePurchaseResponse.status()).toBe(404);
  });
});
