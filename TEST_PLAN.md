# Test plan: "Can I get this name?"

## Question and scope

One user question, four doors: Storefront, WHOIS lookup, Business Name Generator, Public Domain Search API. The plan tests whether each door gives a correct, consistent answer to "can I get this name?", first as an unauthorised user (anonymous browser, API without a key), then compared with the authorised path (the real account-level key) and across doors.

The public contract is the two documented GET endpoints, `check-domain-availability` and `suggest-domains`. The `www.wix.com` endpoints behind the web doors are internal: tests use them only as an oracle for what the screen should show, never as a contract.

How the doors are built and what each call drives: `ARCHITECTURE.md`.

## Approach

- **One flow per door, unauthorised first.** Every web flow runs in a fresh browser context with no login. The API flow runs without a key first; the same inputs then run with the real key and the answers are compared.
- **Oracles.** The API documentation for the contract. The web door's own `check-domain-availability` response for what its screen must say. The public API, called at the same moment, for whether a web door agrees with it.
- **Test data that does not drift.** `google.com` is registered since 1997, so "taken" is stable. A free name is a random `wixqa-<8 random characters>.com` generated per run, because availability is a point-in-time answer and any fixed free name can be bought.
- **Assert meaning, not wording.** Banner wording and the set of internal calls vary between loads (Observed), so web tests assert the verdict and the domain, not exact sentences or call lists. Web tests always search a full domain with its TLD.
- **Known defects are asserted as documented.** Where the observed behaviour contradicts the documentation, the test asserts the documented behaviour and is marked `test.fail()` with the finding number. The suite stays green, and the test starts failing loudly the day the behaviour changes.
- **Safety limits in code.** The API client allows one origin and GET only, and stops at 15 calls per run. Web tests abort any top-level navigation away from `www.wix.com` or to a checkout or cart path, and never click "Make It Yours" or "Get It".

## Conditions

3 November 2026, Israel (prices in ₪, `.co.il` suggestions), desktop Chromium, anonymous. Results outside Israel are UNKNOWN.

## P0: must hold before I would sign off a release

| ID | Door | Flow | Check | Oracle | Automated |
|---|---|---|---|---|---|
| P0-1 | API | Unauthorised | `check-domain-availability` for `google.com`: 200, `available: false`, `domain` echoed, field types as documented | Documentation, stable data | `public-api.spec.ts` |
| P0-2 | API | Unauthorised | Same for a random free name: `available: true` | Documentation, random data | `public-api.spec.ts` |
| P0-3 | API | Unauthorised | `suggest-domains` with `tlds=com`, `paging.limit=5`: at most 5 suggestions, every domain ends in `.com`, `premium` is boolean, `pagingMetadata.count` equals the number returned | Documentation | `public-api.spec.ts` |
| P0-4 | API | Unauthorised | Documented errors: `domain=abc` gives 400 `INVALID_DOMAIN`; `tlds=.com` gives 400 `INVALID_TLD_FORMAT` | Documentation | `public-api.spec.ts` |
| P0-5 | API | Unauthorised | A call without a key is rejected, because the documentation requires an account-level key | Documentation | `public-api.spec.ts`, `test.fail()`: finding F1 |
| P0-6 | API | Real key, compared | Taken and free names give the same verdicts as without a key | Documentation, P0-1 and P0-2 | `public-api.spec.ts` |
| P0-7 | API | Real key, compared | An invalid key is rejected | Documentation | `public-api.spec.ts`, `test.fail()`: finding F1 |
| P0-8 | API | Real key, compared | Every suggestion is available: the first suggestion, checked with `check-domain-availability`, is `available: true` | Documentation ("a suggested domain that's available for purchase") | `public-api.spec.ts` |
| P0-9 | Storefront | Unauthorised | Taken name: the screen says it is registered; the page's own response and the public API both say `available: false` | Web response, public API | `storefront.spec.ts` |
| P0-10 | Storefront | Unauthorised | Free name: the screen shows "Available now!" for that domain; the page's response and the public API both say `available: true` | Web response, public API | `storefront.spec.ts` |

## P1: important, covered after P0

| ID | Door | Check | How |
|---|---|---|---|
| P1-1 | WHOIS | Registered domain: the details panel shows the registrar and creation date; registrant contact is redacted | `whois.spec.ts` |
| P1-2 | WHOIS | Free domain: hands off to the Storefront result with "Available now!", consistent with the page's own availability response | `whois.spec.ts` |
| P1-3 | Generator | The names on screen are the names the generator returned; the first domain offered for the first name is available according to the public API | `generator.spec.ts` |
| P1-4 | API | Error handling: a type error in `paging.limit` names the field, like a range error does | Manual, 3 November: finding F3 |
| P1-5 | API | `premiumType` conforms to the documented enum | Manual, 3 November: finding F2 |
| P1-6 | API docs | Auth headers, `paging.limit` minimum, deprecated `limit` are documented consistently | Manual review: finding F4 |
| P1-7 | Storefront, WHOIS | Input without a TLD, uppercase, surrounding spaces, a full URL (WHOIS asks for "a domain name or URL") | Planned, not executed: UNKNOWN |
| P1-8 | All web doors | Web verdict equals the public API verdict on names whose answer does not change | Covered by P0-9 for `google.com`; more stable names left for another week |

## Deferred, with reasons

| Area | Why deferred |
|---|---|
| Pricing and currency | Depends on geography and promotions; needs a per-market oracle I do not have. Price endpoints are mapped in `ARCHITECTURE.md`. |
| Premium domains | Needs known premium names per TLD; the premium half of F2 did not reproduce on 3 November. |
| Pagination (`paging.cursor`) | The cursor is unsigned base64 JSON (Observed); tampering is a security test that needs its own budget. |
| Geography | One location (Israel) available. |
| Mocks and stubbed contract tests | Response substitution was used once to prove which call drives the screen; turning it into a suite is next-week work. |
| Logged-in web flows | Outside the anonymous conditions. Two candidates (WHOIS `whois` endpoint returning 403 when logged in; transfer validation reporting an error inside a 200 body) stay unverified for that reason. |
| Generator console error (`borderColor=""`) | No user-visible effect shown yet; needs a visual check. |

## Never in scope

- Completing a purchase, entering checkout, or clicking "Make It Yours" or "Get It".
- Load testing, brute force, scraping, or enumerating names.
- Any account other than mine; any logged-in flow in automation.

## Risks and how the plan handles them

| Risk | Handling |
|---|---|
| A free name gets registered between the API call and the screen | Random 8-character names; both answers are taken within seconds |
| Suggestions and generated names differ per call | Tests compare a door with its own response from the same load, never with a stored list |
| Selector or wording changes on wix.com | Locators use visible labels and placeholders; assertions use domain names and verdicts |
| WHOIS details arrive after about 15 seconds | 60-second web test timeout; waits on content, not on time |
| API call budget | About 210 calls used by the start of automation; 15 public API calls per full run (12 API, 3 web comparisons) |
