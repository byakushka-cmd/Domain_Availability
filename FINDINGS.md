# Findings: bugs

Only defects whose expected result is stated in the Wix API documentation or in the assignment. Everything else, including risks and UI items without a documented expectation, is in [OBSERVATIONS.md](OBSERVATIONS.md).

Conditions: 3 November 2026, Israel, anonymous unless stated. **Severity:** impact on users or integrators if it hits. **Priority:** how soon I would act. Both High / Medium / Low.

| ID | Bug | Severity | Priority | Automated |
|---|---|---|---|---|
| F1 | Public API answers without a key and with an invalid key | Medium | High | Yes, `test.fail()` ×2 |
| F2 | `premiumType` returns `UNKNOWN_PREMIUM_TYPE`, outside the documented enum | Low | Low | No |
| F3 | A domain with a space gets an undocumented error instead of `INVALID_DOMAIN` | Low | Low | Yes, `test.fail()` |
| F4 | `paging.limit=0` is rejected although the documentation gives a minimum of 0 | Low | Low | No |

---

## F1. Public API answers without a key and with an invalid key

**Expected.** A call without a valid account-level key is rejected (401 or 403).
- Wix API documentation, Check Domain Availability and Suggest Domains: the call "requires an account level API key".
- Assignment: "To call the public API you need an account-level API key."

**Actual (Observed, 3 November 2026, 11:39 UTC).** `GET https://www.wixapis.com/domain-search/v2/check-domain-availability?domain=google.com`:

| Authorization header | Status | Body |
|---|---|---|
| none | 200 | `{"availability":{"domain":"google.com","available":false,"premium":false,"premiumType":"UNKNOWN_PREMIUM_TYPE"}}` |
| `invalid` | 200 | identical |
| real account-level key | 200 | identical |

Response headers have the same names in all three; only `x-wix-request-id` and the opaque `x-seen-by` list differ. `suggest-domains` also answers 200 without a key. Reproduced with curl, Postman (no cookies) and Node `fetch`.

```bash
curl -i 'https://www.wixapis.com/domain-search/v2/check-domain-availability?domain=google.com'
```

**Severity: Medium.** Availability is public data, so nothing secret leaks. The impact is on control: usage cannot be tied to an account, so per-account quotas and abuse limits cannot apply; a revoked or mistyped key keeps "working"; switching enforcement on later breaks every integration that never sent a valid key.
**Priority: High.** Needs a decision now: enforce the key, or document the endpoints as public.
**Automated.** `public-api.spec.ts`: "a call without a key is rejected" and "an invalid key is rejected" assert the documented behaviour, are marked `test.fail()`, and failed as expected in the full run on 3 November at 15:47.

## F2. `premiumType` returns `UNKNOWN_PREMIUM_TYPE`, outside the documented enum

**Expected.** Wix API documentation, Check Domain Availability: `premiumType` has the enum `FIRST_YEAR_ONLY`, `FIRST_YEAR_AND_RENEWAL`.

**Actual (Observed, 3 November 2026, 11:39 UTC, real key).** `"premiumType":"UNKNOWN_PREMIUM_TYPE"` for `google.com`, `google.biz`, `google.art` and a random free `.com`, all with `premium: false`. The web endpoint behind the Storefront returns the same value. `premium: true` together with `UNKNOWN_PREMIUM_TYPE` was seen on 2 November for `google.biz` and `google.art` but did not reproduce on 3 November.

**Severity: Low.** The documentation describes the field for premium domains, so for non-premium answers it carries no meaning; but a client generated from the documented enum (strict deserialisation, exhaustive `switch`) meets a value it does not know. If `premium: true` with `UNKNOWN_PREMIUM_TYPE` reappears, the user cannot tell whether renewal is premium too: Medium.
**Priority: Low.** Document the value, or omit the field when `premium` is false.
**Automated.** No. The contract check in `public-api.spec.ts` asserts the enum only when `premium` is true, because the documentation describes the field for premium domains.

## F3. A domain with a space gets an undocumented error instead of `INVALID_DOMAIN`

**Expected.** Wix API documentation, [Domain Search error messages](https://dev.wix.com/docs/api-reference/account-level/domains/domain-search/availability-v2/error-messages): Check Domain Availability returns 400 `INVALID_DOMAIN` when the root domain cannot be extracted or the TLD is missing or invalid. `mydomain com` has no dot, so no TLD.

**Actual (Observed in Postman, 3 November 2026).**

| Request | Status | `message` | Field violation |
|---|---|---|---|
| `check-domain-availability?domain=mydomain` | 400 | `INVALID_DOMAIN` (matches the documentation) | `domain` |
| `check-domain-availability?domain=mydomain com` | 400 | `domain is not a valid hostname` | `domain`, `violatedRule: FORMAT`, `data.type: HOSTNAME` |

**Severity: Low.** The request is rejected, but a client that branches on the documented code in `message` does not recognise this response.
**Priority: Low.** Return `INVALID_DOMAIN`, or document the `FORMAT` response.
**Automated.** `public-api.spec.ts`: "a domain with a space is rejected with INVALID_DOMAIN, as documented", marked `test.fail()`; failed as expected in the full run on 3 November at 15:47. An expected failure passes on any failure, so the 400 status itself rests on the Postman check.

## F4. `paging.limit=0` is rejected although the documentation gives a minimum of 0

**Expected.** Wix API documentation, Suggest Domains: `paging.limit` "Min: `0`" in the field description. (The same field's validation line says "minimum 1", so the documentation contradicts itself.)

**Actual (Observed, 3 November 2026, 12:44 UTC, real key).** `GET /domain-search/v2/suggest-domains?query=artisan%20bakery&paging.limit=0` returned 400:

```json
{"message":"paging is invalid:\n`-- limit got 0, expected 1 or more","details":{"validationError":{"fieldViolations":[{"field":"paging.limit","description":"got 0, expected 1 or more","violatedRule":"MIN","data":{"threshold":1.0}}]}}}
```

**Severity: Low.** An integrator who follows the description gets a 400.
**Priority: Low.** Correct the description to "Min: 1".
**Automated.** No; one manual call, to save the call budget.
