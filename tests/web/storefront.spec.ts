import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { apiGet, keyHeaders } from '../support/wix-api';
import { blockLeavingWix } from '../support/web-guard';

const CHECK = '/domain-search/v2/check-domain-availability';
// Two answers further apart than this may disagree because the name changed hands, not because a door is wrong.
const MAX_GAP_MS = 15_000;

// Each test gets a fresh browser context with no storage state: an unauthorised user.
test.beforeEach(async ({ page }) => {
  await blockLeavingWix(page);
});

// Searches from the Storefront entry page and asks the public API the moment the page has its own answer.
async function searchAndAskApi(page: Page, request: APIRequestContext, domain: string) {
  await page.goto('/domains', { waitUntil: 'load' });
  const webResponse = page.waitForResponse(
    r => r.url().includes(CHECK) && new URL(r.url()).searchParams.get('domain') === domain,
  );
  // The header holds a second search form with the same placeholder; the hero search is in <main>.
  const main = page.getByRole('main');
  // The first search right after `load` was ignored in every try on 3 November, so retry until the page navigates.
  await expect(async () => {
    await main.getByPlaceholder('Type the domain you want').first().fill(domain);
    await main.getByRole('button', { name: 'Search Domains' }).first().click();
    await expect(page).toHaveURL(/\/domain\/result\//, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  const web = await (await webResponse).json();
  const webAnsweredAt = Date.now();
  // The typed domain, TLD included, reaches the backend unchanged.
  expect(web.availability.domain).toBe(domain);

  const apiResponse = await apiGet(request, CHECK, { domain }, keyHeaders());
  const gapMs = Date.now() - webAnsweredAt;
  test.info().annotations.push({ type: 'web-to-API gap', description: `${gapMs} ms` });
  expect(apiResponse.status()).toBe(200);
  expect(gapMs).toBeLessThan(MAX_GAP_MS);
  return { web, api: await apiResponse.json() };
}

test.describe('Storefront, unauthorised user', () => {
  test('a taken name: the screen, the page response and the public API all say taken', async ({ page, request }) => {
    const domain = 'google.com';
    const { web, api } = await searchAndAskApi(page, request, domain);
    expect(web.availability.available).toBe(false);
    expect(api.availability.available).toBe(false);
    await expect(page.getByText(/google\.com is (already registered|taken)/i).first()).toBeVisible();
    await expect(page.getByText('Available now!')).toHaveCount(0);
  });

  test('a free name: the screen, the page response and the public API all say available', async ({ page, request }) => {
    // Availability is a point-in-time answer, so a fixed free name could be bought; 8 random characters per run.
    const domain = `wixqa-${Math.random().toString(36).slice(2, 10)}.com`;
    const { web, api } = await searchAndAskApi(page, request, domain);
    expect(web.availability.available).toBe(true);
    expect(api.availability.available).toBe(true);
    await expect(page.getByText('Available now!').first()).toBeVisible();
    // The result page also holds hidden copies of the domain text.
    await expect(page.getByText(domain, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/is already registered/i)).toHaveCount(0);
  });
});
