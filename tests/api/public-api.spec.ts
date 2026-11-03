import { test, expect } from '@playwright/test';
import { apiGet, keyHeaders } from '../support/wix-api';

const CHECK = '/domain-search/v2/check-domain-availability';
const SUGGEST = '/domain-search/v2/suggest-domains';
// Registered since 1997, so "taken" does not drift.
const TAKEN = 'google.com';
// Availability is a point-in-time answer: a new random name per run, shared by both blocks below.
const FREE = `wixqa-${Math.random().toString(36).slice(2, 10)}.com`;

function expectAvailability(body: any, domain: string, available: boolean) {
  expect(body.availability).toMatchObject({ domain, available, premium: expect.any(Boolean) });
  // The enum is documented only for premium domains; non-premium answers carry UNKNOWN_PREMIUM_TYPE (finding F2).
  if (body.availability.premium) {
    expect(['FIRST_YEAR_ONLY', 'FIRST_YEAR_AND_RENEWAL']).toContain(body.availability.premiumType);
  }
}

test.describe('Unauthorised: no key', () => {
  test('a taken domain is reported as taken', async ({ request }) => {
    const res = await apiGet(request, CHECK, { domain: TAKEN }, {});
    expect(res.status()).toBe(200);
    expectAvailability(await res.json(), TAKEN, false);
  });

  test('a free domain is reported as available', async ({ request }) => {
    const res = await apiGet(request, CHECK, { domain: FREE }, {});
    expect(res.status()).toBe(200);
    expectAvailability(await res.json(), FREE, true);
  });

  test('suggestions respect the TLD filter and the limit', async ({ request }) => {
    const res = await apiGet(request, SUGGEST, { query: 'artisan bakery', tlds: 'com', 'paging.limit': 5 }, {});
    expect(res.status()).toBe(200);
    const { suggestions, pagingMetadata } = await res.json();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(5);
    expect(pagingMetadata.count).toBe(suggestions.length);
    for (const s of suggestions) {
      expect(s.domain).toMatch(/\.com$/);
      expect(typeof s.premium).toBe('boolean');
    }
  });

  test('a domain without a TLD is rejected with INVALID_DOMAIN', async ({ request }) => {
    const res = await apiGet(request, CHECK, { domain: 'abc' }, {});
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('INVALID_DOMAIN');
  });

  test('a domain with a space is rejected with INVALID_DOMAIN, as documented', async ({ request }) => {
    test.fail(true, 'F3: answers 400 "domain is not a valid hostname" (rule FORMAT) instead of INVALID_DOMAIN (observed in Postman 3 November 2026)');
    const res = await apiGet(request, CHECK, { domain: 'mydomain com' }, {});
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('INVALID_DOMAIN');
  });

  test('a TLD with a dot is rejected with INVALID_TLD_FORMAT', async ({ request }) => {
    const res = await apiGet(request, SUGGEST, { query: 'artisan bakery', tlds: '.com' }, {});
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('INVALID_TLD_FORMAT');
  });

  test('a call without a key is rejected', async ({ request }) => {
    test.fail(true, 'F1: documented as requiring an account-level key, but answers 200 without one (observed 3 November 2026)');
    const res = await apiGet(request, CHECK, { domain: TAKEN }, {});
    expect([401, 403]).toContain(res.status());
  });
});

test.describe('Real key, compared with the unauthorised answers', () => {
  test('a taken domain gets the same verdict', async ({ request }) => {
    const res = await apiGet(request, CHECK, { domain: TAKEN }, keyHeaders());
    expect(res.status()).toBe(200);
    expectAvailability(await res.json(), TAKEN, false);
  });

  test('the same free domain gets the same verdict', async ({ request }) => {
    const res = await apiGet(request, CHECK, { domain: FREE }, keyHeaders());
    expect(res.status()).toBe(200);
    expectAvailability(await res.json(), FREE, true);
  });

  test('an invalid key is rejected', async ({ request }) => {
    test.fail(true, 'F1: answers 200 with an invalid key (observed 3 November 2026)');
    const res = await apiGet(request, CHECK, { domain: TAKEN }, { Authorization: 'invalid' });
    expect([401, 403]).toContain(res.status());
  });

  test('the first suggestion is available for purchase', async ({ request }) => {
    const suggest = await apiGet(request, SUGGEST, { query: 'artisan bakery', 'paging.limit': 1 }, keyHeaders());
    expect(suggest.status()).toBe(200);
    const { suggestions } = await suggest.json();
    expect(suggestions.length).toBeGreaterThan(0);
    const check = await apiGet(request, CHECK, { domain: suggestions[0].domain }, keyHeaders());
    expect(check.status()).toBe(200);
    expectAvailability(await check.json(), suggestions[0].domain, true);
  });
});
