# Wix Domains QA: "Can I get this name?"

**Total time:** about 2 h 50 min, from the first commit (13:28) to the last (about 16:17) on 3 November 2026. Exploration on 2–3 November came before the first commit.

Home assignment for the QA Engineer role on Wix Domains. One user question, four doors: the Domain Storefront, the Business Name Generator, the WHOIS lookup and the Public Domain Search API.

| File | What it holds |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | What each door is made of, which calls drive which part of the screen, how the doors relate; Mermaid diagram and evidence levels |
| [TEST_PLAN.md](TEST_PLAN.md) | Scope, approach, P0 / P1 / Deferred with reasons, exclusions, risks |
| [FINDINGS.md](FINDINGS.md) | Four bugs: documented expected result versus actual result, with evidence, severity and priority |
| [OBSERVATIONS.md](OBSERVATIONS.md) | Risks and observations without a documented expected result, including two UI items |
| [AI_LOG.md](AI_LOG.md) | AI tools, key prompts, where the AI was wrong, what was kept out of its hands |
| [CLAUDE.md](CLAUDE.md) | Rules for the coding agent in this repo |
| `tests/` | Playwright + TypeScript automation |

## Run the tests

Requirements: Node.js 20.12 or later (developed on 26), and a Wix account-level API key from https://manage.wix.com/account/api-keys.

```bash
cp .env.example .env
```

Put your key in `.env` as `WIX_API_KEY=...`. `.env` is git-ignored and is the only place the key lives.

One command installs, downloads Chromium and runs everything:

```bash
npm ci && npx playwright install chromium && npm test
```

Subsets: `npm run test:api`, `npm run test:web`. HTML report: `npx playwright show-report`.

**Reading the result.** Three API tests show `✘` and still count as passed. They assert the documented behaviour, are marked `test.fail()`, and fail because of findings F1 (no key and an invalid key are accepted) and F3 (a malformed domain gets an undocumented error format). If one of them turns green, Playwright fails the run, so a fix or a change on the Wix side is noticed.

## What is automated, and why

| Spec | Door | Tests | Oracle | Public API calls |
|---|---|---|---|---|
| `tests/api/public-api.spec.ts` | Public API | 11: unauthorised (no key) first, then the same inputs with the real key | API documentation | 12 |
| `tests/web/storefront.spec.ts` | Storefront | 2: a taken and a free name, searched from `wix.com/domains` | The page's own availability response, and the public API asked at the same moment | 2 |
| `tests/web/whois.spec.ts` | WHOIS | 2: a registered domain shows registrar and redacted registrant; a free domain hands off to the Storefront result | The page's own availability response | 0 |
| `tests/web/generator.spec.ts` | Generator | 1: the generated names are on screen, and the first domain offered is available | The generator's own response, and the public API | 1 |

Choices behind it:
- **Unauthorised first, then compared.** Every web test runs in a fresh browser context without login. The API spec runs without a key first, then repeats the inputs with the real key.
- **Cross-door agreement is the core check.** A web door is compared with its own `check-domain-availability` response and with the public API, asked within a 15-second window; the measured gap is attached to the report.
- **Data that does not drift.** `google.com` for "taken"; a new random `wixqa-<8 characters>.com` per run for "free", because availability is a point-in-time answer.
- **Assert meaning, not wording.** Verdicts and domain names, not banner sentences or lists of internal calls, which vary between loads.
- **Not automated:** pricing, premium, pagination, geography, logged-in flows, mocked UI states. Reasons are in `TEST_PLAN.md` under Deferred.

## Safety limits in code

- `tests/support/wix-api.ts`: the only path to the public API. One allowed origin, GET only, and a hard stop at 15 calls per run, counted in `test-results/api-call-count`. A full run uses exactly 15.
- `tests/support/web-guard.ts`: aborts any top-level navigation away from `www.wix.com` or to a checkout or cart path. Tests never click "Make It Yours" or "Get It".
- One worker and no retries, to keep the load on Wix minimal and the call count exact. API traces are off so the `Authorization` header is never written to disk. Reports, traces and HAR files are git-ignored.

## Last results

Full run on 3 November 2026 at 15:47 (Israel time), from Israel, nothing else running: 16 tests, all as expected (13 passed, 3 expected failures for F1 and F3), 0 unexpected, 50 seconds, exactly 15 public API calls. Web-to-API gaps: 653 ms (Generator), 530 ms and 555 ms (Storefront).

Known limits: results hold for Israel only; locators rely on visible labels and placeholders; the first search right after page load was ignored on 3 November, so web tests retry the search until the page navigates.

## With another week

1. A scheduled cross-door monitor: many suggestions from the API and the Generator checked with `check-domain-availability`, and web verdicts compared with the API on stable names; alert on disagreement (observation O1).
2. Runs from several countries for prices, currency and country-specific suggestions.
3. Pricing and premium coverage with a per-market oracle and known premium names, once F2 is decided.
4. Schema-level contract tests generated from the documentation, plus pagination and cursor tests, including cursor tampering as a security test.
5. A mocked suite built from the response substitutions in `ARCHITECTURE.md`: error responses, slow RDAP, the 500 from broker offers, each as a UI regression test.
6. Input normalisation on the web doors: uppercase, spaces, full URLs in WHOIS, internationalised domains.
7. Logged-in flows in my own account (dashboard search, WHOIS 403, transfer validation) with a storage state kept out of git.
8. CI with the key as a secret, nightly runs, flake tracking and accessibility checks.
9. The documented API cases not yet covered: `INVALID_QUERY`, `TLD_NOT_SUPPORTED`, `maxLength`, the 10-TLD limit, length boundaries (domain 3–63, query 1–100), and whether the deprecated `limit` still works.
10. The UI observations: whether the ignored first search (O4) affects real users, and a visual check of the Generator's error state (O5).
11. The selection path up to sign-in, in my own account: does the Generator re-check availability at "Get It" (O1)?
12. Firefox and WebKit, the Hebrew right-to-left locale, and WHOIS latency tracked over time.

## Quality strategy for Wix Domains, in 5 lines

1. One question, many doors: test that every door gives the same answer at the same moment, not each page alone.
2. The public API contract is the reference; web doors are checked against their own response and against the API.
3. Time-sensitive answers get fresh data and short gaps, never stored expectations.
4. Known contract gaps stay in the suite as documented-behaviour tests marked expected-fail, so a fix or a regression is noticed.
5. Read-only, budgeted, never near the purchase path, secrets only in the environment.
