import { test, expect, type Response } from '@playwright/test';
import { apiGet, keyHeaders } from '../support/wix-api';
import { blockLeavingWix } from '../support/web-guard';

const CHECK = '/domain-search/v2/check-domain-availability';
// Two answers further apart than this may disagree because the name changed hands, not because a door is wrong.
const MAX_GAP_MS = 15_000;

// Each test gets a fresh browser context with no storage state: an unauthorised user.
test.beforeEach(async ({ page }) => {
  await blockLeavingWix(page);
});

test.describe('Business Name Generator, unauthorised user', () => {
  test('shows the generated names, and its first domain is available according to the public API', async ({ page, request }) => {
    await page.goto('/tools/business-name-generator', { waitUntil: 'load' });
    // Both calls are made by the result page after it opens (observed 3 November).
    const fromResultPage = (r: Response) => r.frame().url().includes('/domain/result/bng');
    const generated = page.waitForResponse(r => r.url().includes('/business-names/generate') && fromResultPage(r));
    const suggested = page.waitForResponse(r => r.url().includes('/domain-search/v2/suggest-domains') && fromResultPage(r));
    // A click right after `load` was ignored once on 3 November, so retry until the page navigates.
    await expect(async () => {
      await page.getByPlaceholder(/I own a small catering company/).fill('artisan sourdough bakery');
      await page.getByRole('button', { name: 'Generate Names' }).click();
      await expect(page).toHaveURL(/\/domain\/result\/bng\?query=/, { timeout: 3_000 });
    }).toPass({ timeout: 30_000 });

    const { businessNames } = await (await generated).json();
    const suggestResponse = await suggested;
    const { suggestions } = await suggestResponse.json();
    const webAnsweredAt = Date.now();
    // The Generator asks for domains for its first name only; it makes no availability check (finding F5).
    expect(new URL(suggestResponse.url()).searchParams.get('query')).toBe(businessNames[0].name);
    const firstDomain: string = suggestions[0].domain;

    const apiResponse = await apiGet(request, CHECK, { domain: firstDomain }, keyHeaders());
    const gapMs = Date.now() - webAnsweredAt;
    test.info().annotations.push({ type: 'web-to-API gap', description: `${gapMs} ms` });
    expect(apiResponse.status()).toBe(200);
    expect(gapMs).toBeLessThan(MAX_GAP_MS);
    expect((await apiResponse.json()).availability.available).toBe(true);

    // Names are generated and differ per call, so the screen is compared with this load's own response.
    for (const { name } of businessNames) {
      await expect(page.getByText(name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    }
    await expect(page.getByText(firstDomain, { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });
});
