# Findings

Five items, re-verified on 3 November 2026 from Israel, anonymous unless stated. Four are defects against the documented contract or its documentation; F5 is a risk, not a defect.

**Severity:** impact on users or integrators if it hits. **Priority:** how soon I would act. Both on a High / Medium / Low scale.

| ID | Title | Type | Severity | Priority |
|---|---|---|---|---|
| F1 | Public API answers without a key and with an invalid key | Defect (contract) | Medium | High |
| F2 | `premiumType` returns `UNKNOWN_PREMIUM_TYPE`, outside the documented enum | Defect (contract) | Low | Low |
| F3 | Validation errors come in three different formats | Defect (error handling) | Low | Low |
| F4 | Domain Search documentation contradicts itself on auth and paging | Defect (documentation) | Low | Medium |
| F5 | The Generator shows domains as available without any availability check | Risk | Medium | Medium |

---

## F1. Public API answers without a key and with an invalid key

**Expected (Documented).** Both endpoints state that the call "requires an account level API key". The assignment says the same. A call without a key, or with an invalid one, should be rejected (401 or 403).

**Actual (Observed, 3 November 2026, 11:39 UTC).** Three calls to `GET https://www.wixapis.com/domain-search/v2/check-domain-availability?domain=google.com`:

| Authorization header | Status | Body |
|---|---|---|
| none | 200 | `{"availability":{"domain":"google.com","available":false,"premium":false,"premiumType":"UNKNOWN_PREMIUM_TYPE"}}` |
| `invalid` | 200 | identical |
| real account-level key | 200 | identical |

The response headers have the same names in all three; only `x-wix-request-id` and the opaque `x-seen-by` list differ. `suggest-domains` also answers 200 without a key. Reproduced on 3 November in curl and Postman without cookies, and with Node `fetch` (no cookie jar).

**Reproduce.**
```bash
curl -i 'https://www.wixapis.com/domain-search/v2/check-domain-availability?domain=google.com'
```

**Severity: Medium.** The data is not secret: availability is public and the web doors serve it anonymously. The impact is on control: usage cannot be attributed to an account, so per-account quotas and abuse limits cannot apply. A revoked or mistyped key keeps "working", so integrators cannot tell whether their auth is correct. If enforcement is switched on later, every integration that never sent a valid key breaks at once.

**Priority: High.** It needs a decision, not necessarily a code fix: either enforce the key as documented, or document the endpoints as public. Until then, the documented contract and the behaviour disagree on the first thing an integrator sets up.

**Automated.** `public-api.spec.ts`: "a call without a key is rejected" and "an invalid key is rejected" assert the documented behaviour and are marked `test.fail()`. Both ran on 3 November (13:53 and 14:55 local time) and failed as expected. They will fail the run when the behaviour changes, prompting a review.

## F2. `premiumType` returns `UNKNOWN_PREMIUM_TYPE`, outside the documented enum

**Expected (Documented).** `premiumType` is documented with the enum `FIRST_YEAR_ONLY`, `FIRST_YEAR_AND_RENEWAL`, describing the premium type "in case the domain is premium".

**Actual (Observed, 3 November 2026).** Every non-premium answer carries `"premiumType":"UNKNOWN_PREMIUM_TYPE"`: `google.com`, `google.biz`, `google.art` and a random free `.com` through the public API with the real key, and the same value from the web endpoint on the Storefront. On 2 November, `premium: true` together with `UNKNOWN_PREMIUM_TYPE` was seen for `google.biz` and `google.art`; on 3 November both returned `premium: false` through the public API, so that combination did not reproduce.

**Severity: Low.** For non-premium domains the field carries no meaning, but a client generated from the documented enum (strict deserialisation, exhaustive `switch`) meets a value it does not know. If `premium: true` with `UNKNOWN_PREMIUM_TYPE` reappears, the user cannot tell whether renewal is also premium; that case would be Medium.

**Priority: Low.** Document `UNKNOWN_PREMIUM_TYPE` as the value for non-premium domains, or omit the field when `premium` is false.

## F3. Validation errors come in three different formats

**Expected (Documented).** The [error messages page](https://dev.wix.com/docs/api-reference/account-level/domains/domain-search/availability-v2/error-messages) lists one error for Check Domain Availability, 400 `INVALID_DOMAIN` (root domain cannot be extracted, or the TLD is missing or invalid), and three for Suggest Domains: `INVALID_QUERY`, `INVALID_TLD_FORMAT`, `TLD_NOT_SUPPORTED`. Each is a code in `message` that a client can branch on.

**Actual (Observed, 3 November 2026).** Every request below was rejected with 400, but the body comes in three formats:

| Request | `message` | Field named | Format |
|---|---|---|---|
| `check-domain-availability?domain=abc` (real key, 11:39 UTC; Postman with `mydomain`) | `INVALID_DOMAIN` | `domain` | 1: documented code |
| `suggest-domains?tlds=.com` (real key, 11:39 UTC) | `INVALID_TLD_FORMAT` | `tlds` | 1: documented code |
| `check-domain-availability?domain=mydomain com` (Postman) | `domain is not a valid hostname` | `domain`, `violatedRule: FORMAT` | 2: sentence, not a documented code |
| `suggest-domains?paging.limit=0` (real key, 12:44 UTC) | ``paging is invalid: `-- limit got 0, expected 1 or more`` | `paging.limit`, `violatedRule: MIN` | 2: sentence |
| `suggest-domains?paging.limit=abc` (real key, 11:39 UTC) | `Failed to parse JSON or deserialize protobuf message`, `details: {}` | none | 3: generic parse error |

`mydomain com` has no dot, so by the documented description it has no TLD and should be `INVALID_DOMAIN`. `paging.limit=100` (format 2, rule `MAX`) and `paging.limit=5 ` with a trailing space (format 3) were seen during exploration on 3 November. Whether generic validation errors (`FORMAT`, `MIN`, `MAX`) are documented on a platform-wide page is UNKNOWN.

**Severity: Low.** Every bad request is rejected correctly. The cost is on the client: code that branches on the documented codes in `message` does not recognise formats 2 and 3, and format 3 names no field and exposes an implementation detail (JSON, protobuf) for a query string.

**Priority: Low.** Developer experience; fix with the next change to request validation, together with documenting whichever format is kept.

**Automated.** `public-api.spec.ts`: "a domain with a space is rejected with INVALID_DOMAIN, as documented" asserts the documented code and is marked `test.fail()`. It ran on 3 November at 14:55 and failed as expected. Because an expected failure passes on any failure, that run does not by itself prove the 400 status; the Postman check does.

## F4. Domain Search documentation contradicts itself on auth and paging

**Actual (Documented, read on 3 November 2026).** On the Check Domain Availability and Suggest Domains pages:
- **Auth.** The text says the call cannot be authenticated with the standard authorization header, yet both curl examples send `Authorization: <AUTH>` and nothing else. The SDK examples build an API-key client with a `siteId` for an account-level API. `wix-account-id` is not mentioned. Together with F1, an integrator cannot learn which headers are required.
- **`paging.limit` minimum.** The same field reads "Min: `0`" in its description and "minimum 1" in its validation. The API follows the validation: `paging.limit=0` with the real key returned 400 with `fieldViolations` on `paging.limit`, rule `MIN`, threshold 1 (Observed, 3 November 2026, 12:44 UTC). The description is the wrong one.
- **Deprecated `limit`.** Listed with "will be removed on March 1, 2025", twenty months after that date. Whether it still works: UNKNOWN (not called, to save budget).

**Severity: Low.** No runtime impact; integrators lose time and may hard-code the wrong headers.

**Priority: Medium.** The documentation is the public contract. It should be fixed together with the F1 decision, because the auth section has to say whatever F1 decides.

## F5. Risk: the Generator shows domains as available without any availability check

**Observation (Observed, 3 November 2026).** After `POST S/business-names/generate`, the Generator calls only `suggest-domains?query=<first name>` and lists the results with "Get It" buttons. Unlike the Storefront, it makes no `check-domain-availability` call and no bulk availability call before selection. The Storefront re-checks availability when "Make It Yours" is clicked (Observed); for the Generator a re-check at selection is UNKNOWN, because "Get It" is a buy button and was not clicked.

**Why it matters.** The Generator's whole "you can get this name" answer rests on one documented promise: a suggestion is "a suggested domain that's available for purchase". How `suggest-domains` decides availability is not documented. If that promise breaks, for a name registered minutes ago or a TLD whose registry answers slowly, the user picks a name, invests in it, and learns at checkout that it is gone.

**Severity: Medium** if it happens: wrong answer to the core question, discovered late. **Priority: Medium:** cheap to monitor.

**Mitigation in this repo.** `public-api.spec.ts` checks the first API suggestion with `check-domain-availability`; it passed in both runs on 3 November (13:53 and 14:55 local time). A Generator-side check of the first domain the Generator shows is planned in `generator.spec.ts` and not yet written. One suggestion per run is a sample, not proof; with another week this becomes a scheduled check over many suggestions.
