import { expect, test } from "@playwright/test";

test.describe("PulseBoard AI — Smoke E2E", () => {
  test("navigates from / to /board via CTA and verifies /api/health & /api/docs with zero console errors", async ({
    page,
    request,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.getByRole("link", { name: /Probar Tablero Demo/i }).first(),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /Probar Tablero Demo/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByText("FlowMind Product Launch Q4")).toBeVisible();
    await expect(page.getByText("En Desarrollo")).toBeVisible();

    const healthRes = await request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = (await healthRes.json()) as {
      status: string;
      service: string;
      dbLatencyMs: number;
    };
    expect(healthJson.status).toBe("ok");
    expect(healthJson.service).toBe("pulseboard-ai");
    expect(healthJson.dbLatencyMs).toBeGreaterThanOrEqual(0);

    await page.goto("/api/docs");
    await expect(
      page.getByRole("heading", { name: /PulseBoard AI API/i }),
    ).toBeVisible();
    await expect(
      page.getByText("OpenAPI 3.1.0", { exact: true }),
    ).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
