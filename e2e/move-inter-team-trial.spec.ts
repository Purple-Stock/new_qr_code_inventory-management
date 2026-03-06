import { expect, test } from "@playwright/test";

test.describe("Move Between Teams - Trial Eligibility", () => {
  test("lists destination team when both teams are in active manual trial", async ({ page }) => {
    const seed = Date.now();
    const email = `e2e-trial-${seed}@example.com`;
    const password = "TrialTest@2026";
    const companyName = `E2E Trial ${seed}`;
    const sourceTeamName = `Source ${seed}`;
    const destinationTeamName = `Destination ${seed}`;

    await page.goto("/signup");
    await page.locator('input[type="text"]').first().fill(companyName);
    await page.locator('input[type="email"]').fill(email);
    await page.locator("#password").fill(password);
    await page.locator("#confirmPassword").fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/team_selection/, { timeout: 20000 });

    const sourceTeamResponse = await page.request.post("/api/teams", {
      data: { name: sourceTeamName, notes: null },
    });
    expect(sourceTeamResponse.ok()).toBeTruthy();
    const sourceTeamPayload = await sourceTeamResponse.json();
    const sourceTeamId = sourceTeamPayload.team.id as number;

    const destinationTeamResponse = await page.request.post("/api/teams", {
      data: { name: destinationTeamName, notes: null },
    });
    expect(destinationTeamResponse.ok()).toBeTruthy();
    const destinationTeamPayload = await destinationTeamResponse.json();
    const destinationTeamId = destinationTeamPayload.team.id as number;

    const sourceTrialResponse = await page.request.post(`/api/teams/${sourceTeamId}/billing/trial`, {
      data: { durationDays: 14, reason: "e2e move inter-team trial source" },
    });
    expect(sourceTrialResponse.ok()).toBeTruthy();

    const destinationTrialResponse = await page.request.post(
      `/api/teams/${destinationTeamId}/billing/trial`,
      {
        data: { durationDays: 14, reason: "e2e move inter-team trial destination" },
      }
    );
    expect(destinationTrialResponse.ok()).toBeTruthy();

    await page.goto(`/teams/${sourceTeamId}/move`);
    await page.getByRole("button", { name: /Entre times|Between teams/i }).click();

    await expect(page.getByRole("combobox", { name: /Time de Destino|Destination Team/i })).toContainText(
      destinationTeamName
    );
  });
});
