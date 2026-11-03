import { test, expect, type Page } from '@playwright/test';
import { blockLeavingWix } from '../support/web-guard';

const CHECK = '/domain-search/v2/check-domain-availability';

// Each test gets a fresh browser context with no storage state: an unauthorised user.
test.beforeEach(async ({ page }) => {
  await blockLeavingWix(page);
});

// Searches from the WHOIS entry page and returns the page's own availability answer.
async function searchWhois(page: Page, domain: string) {
  await page.goto('/domains/whois', { waitUntil: 'load' });
  // The entry page checks availability itself and then navigates away, which discards that body
  // (observed 3 November); wait for the check made by the result page it lands on.
  const webResponse = page.waitForResponse(
    r => r.url().includes(CHECK) && new URL(r.url()).searchParams.get('domain') === domain
      && /\/domain\/result[/?]/.test(r.frame().url()),
  );
  // Enter submits the form the input belongs to, so the duplicate input on the page cannot be mismatched.
  const input = page.getByPlaceholder('Enter a domain name or URL').filter({ visible: true }).first();
  // As on the Storefront, a search right after `load` can be ignored, so retry until the page navigates.
  await expect(async () => {
    await input.fill(domain);
    await input.press('Enter');
    // Both /domain/result?q= and /domain/result/?q= were seen on 3 November.
    await expect(page).toHaveURL(/\/domain\/result[/?]/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  const web = await (await webResponse).json();
  // The typed domain, TLD included, reaches the backend unchanged.
  expect(web.availability.domain).toBe(domain);
  return web;
}

test.describe('WHOIS, unauthorised user', () => {
  test('a registered domain shows its registrar and a redacted registrant', async ({ page }) => {
    const web = await searchWhois(page, 'google.com');
    expect(web.availability.available).toBe(false);
    await expect(page).toHaveURL(/\/domain\/result\/whois\?query=google\.com/);
    // Details come from external RDAP through parse-rdap and arrived after about 15 seconds (observed 3 November).
    await expect(page.getByText('MarkMonitor Inc.').first()).toBeVisible({ timeout: 40_000 });
    // Registrant data is redacted for privacy, which is expected: name and email show a dash.
    await expect(page.locator('body')).toContainText(/Registrant Contact Information\s*Name\s*—\s*Email\s*—/);
  });

  test('a free domain hands off to the Storefront result as available', async ({ page }) => {
    // Availability is a point-in-time answer, so a fixed free name could be bought; 8 random characters per run.
    const domain = `wixqa-${Math.random().toString(36).slice(2, 10)}.com`;
    const web = await searchWhois(page, domain);
    expect(web.availability.available).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/domain/result/?\\?q=${domain.replace(/\./g, '\\.')}`), { timeout: 15_000 });
    await expect(page.getByText('Available now!').first()).toBeVisible();
    await expect(page.getByText(domain, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });
});
