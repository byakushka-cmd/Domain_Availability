import type { APIRequestContext, APIResponse } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const API_ORIGIN = 'https://www.wixapis.com';
export const MAX_CALLS_PER_RUN = 15;
// Playwright empties test-results/ at the start of every run, so the count restarts per run.
const COUNTER_FILE = 'test-results/api-call-count';

// wix-account-id is sent only when set: whether the API requires it is UNKNOWN.
export function keyHeaders(): Record<string, string> {
  const key = process.env.WIX_API_KEY;
  if (!key) throw new Error('WIX_API_KEY is not set. Copy .env.example to .env and add your key.');
  const headers: Record<string, string> = { Authorization: key };
  if (process.env.WIX_ACCOUNT_ID) headers['wix-account-id'] = process.env.WIX_ACCOUNT_ID;
  return headers;
}

function countCall(): void {
  let used = 0;
  try {
    used = Number(readFileSync(COUNTER_FILE, 'utf8'));
  } catch {
    // No file yet: first call of this run.
  }
  if (used >= MAX_CALLS_PER_RUN) throw new Error(`API call budget of ${MAX_CALLS_PER_RUN} per run is used up`);
  mkdirSync('test-results', { recursive: true });
  writeFileSync(COUNTER_FILE, String(used + 1));
}

// The only way tests reach the public API: GET only, one host, counted against the budget.
// Headers are always passed explicitly so a no-key call is visible in the test.
export async function apiGet(
  request: APIRequestContext,
  path: string,
  params: Record<string, string | number>,
  headers: Record<string, string>,
): Promise<APIResponse> {
  const url = new URL(path, API_ORIGIN);
  if (url.origin !== API_ORIGIN) throw new Error(`Blocked host: ${url.origin}`);
  countCall();
  return request.get(url.href, { params, headers, failOnStatusCode: false });
}
