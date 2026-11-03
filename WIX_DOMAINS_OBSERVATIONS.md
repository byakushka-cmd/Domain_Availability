# Wix Domains: Observations to Date

Input for the assignment work, not a deliverable. Each bullet carries a level and a source. No secrets. HAR files are not included and must not be committed.

**Conditions:** 2–3 November 2026, Israel (`geo: IL`, prices in ₪), desktop Chrome. Anonymous unless marked "logged in".

**Levels**
- **Documented:** stated in the Wix API documentation.
- **Verified\*:** link between a call and the screen proven by response substitution during exploration on 2 November. Not reproducible from a repo. Re-check live before it goes into `ARCHITECTURE.md`.
- **Observed:** seen in Network, HAR, curl or Postman. Effect on the screen not proven.
- **Assumed:** hypothesis.
- **UNKNOWN:** no evidence.

`W` = `https://www.wix.com`. `S` = `W/_serverless/domains-serverless-services/v1`.

## 1. Public API contract (`https://www.wixapis.com`)

- `GET /domain-search/v2/check-domain-availability`: `domain` required, includes the TLD, 3–63 characters. Response `availability.{domain, available, premium, premiumType}`. `premiumType`: `FIRST_YEAR_ONLY`, `FIRST_YEAR_AND_RENEWAL`. Error `400 INVALID_DOMAIN`. Documented.
- `GET /domain-search/v2/suggest-domains`: `query` required, 1–100 characters, no TLD. `tlds` up to 10 values, no dot. `paging.limit` maximum 50; the minimum is given as both 0 and 1. Optional `paging.cursor`, `maxLength` (3–63). Errors `INVALID_QUERY`, `INVALID_TLD_FORMAT`, `TLD_NOT_SUPPORTED`. Order of suggestions not documented. Documented.
- Suggestion V2, "About the Suggestion API" (updated 26 October 2026) defines a suggestion as "a suggested domain that's available for purchase". How availability is checked is not documented. Documented.
- Auth: an account-level API key is required. The exact header set is not confirmed (curl examples show `Authorization: <AUTH>`; whether `wix-account-id` is also needed is UNKNOWN).

## 2. Public API behaviour (Observed, 3 November)

- `check-domain-availability?domain=google.com` returned 200 with no `Authorization` header and with `Authorization: invalid`, same body: `{"availability":{"domain":"google.com","available":false,"premium":false,"premiumType":"UNKNOWN_PREMIUM_TYPE"}}`. Reproduced in curl without cookies and in Postman with No Auth. `suggest-domains` also returned 200 without a key. Comparison with a real key: not done.
- `paging.limit=100` → 400 with `fieldViolations`: field `paging.limit`, rule `MAX`, threshold 50.
- `paging.limit=abc` or `"5 "` (trailing space) → 400 `Failed to parse JSON or deserialize protobuf message`, empty `details`, no field named.
- GET with a request body → 400 HTML from the Google front end; the request never reaches Wix.
- Responses carry `x-wix-request-id` and `x-wix-responded-by: wix.premium.domains.v2.availability:CheckDomainAvailability:com.wixpress.premium.domains.domain-search`. The same value appears on `www.wix.com` and `manage.wix.com`. A shared service name is not proof of a shared backend.
- `pagingMetadata.cursors.next` is unsigned base64 JSON (query, shown suggestions, pending list with `engine` `WixOtherGtld` or `Llm`). Tampering not tested. Deferred.

## 3. Web doors: where the answer comes from

All calls below answered without login.

**Storefront** (`W/domain/result/?q=`)
- With a TLD, `GET W/domain-search/v2/check-domain-availability?domain=` drives the verdict: `available=false` shows "<domain> is already registered". Verified\*.
- `GET W/domain-search/v2/suggest-domains?query=&paging.limit=` drives the result list. Verified\*.
- Without a TLD the call set differs between loads: `bbbbbb` and `banana` called only `suggest-domains`; `agenticqa123` also called `check-domain-availability?domain=agenticqa123.com` and `user_domains`. Cause UNKNOWN. Observed 3 November. Consequence: assert what the screen means, not which calls happen.
- Selecting a suggestion (`yellowbanana.online`) sends a new `check-domain-availability` (`available=true`), then 302 to `manage.wix.com/.../login-metasite-creation` (sign-in page). Availability is re-checked at selection. Observed 3 November. Checkout URL never reached: UNKNOWN.
- A search for a taken domain also sends `POST W/domain-search/v2/bulk/domain-availabilities/check`, 3 batches of 60 names. Screen effect UNKNOWN. Observed 2 November.
- `paging.limit` was 50 in one session and 10 in others. Cause UNKNOWN. Observed.

**WHOIS** (`W/domain/result/whois?query=`)
- `check-domain-availability` drives the state: `available=true` shows "Available now!" without the WHOIS panel. Verified\*.
- Registered domain: `GET S/structured-domain-info/rdap-url`, then the browser calls external RDAP (`rdap.verisign.com`, `rdap.markmonitor.com` for `google.com`), then `POST S/structured-domain-info/parse-rdap` twice, then `GET S/structured-domain-info/whois?domain=&parse=`. Chain Observed 3 November. `parse-rdap` drives dates, name servers, status and registrar: Verified\*.
- The banner reads "is taken" or "is registered" in different sessions. Observed. Consequence: do not assert banner wording.
- The result appears after about 15 seconds; a 9-second wait gave a false negative. Observed.
- `whois` endpoint: 403 when logged in to the main account, 200 anonymous. Screen at 403 not checked. Observed 2 November.
- `GET W/v1/domain-broker-offers/query`: 500 `Failed to extract tenant` anonymous (`wikipedia.org`). Screen effect UNKNOWN. Observed 2 November.

**Business Name Generator** (`W/domain/result/bng?query=`)
- `POST S/business-names/generate` with `{"query":"flam","excluding":[],"count":9}` returns 9 `{id, name, reasoning}`. The name list is Verified\*; `reasoning` is not shown.
- Then `suggest-domains?query=<first generated name>&paging.limit=10`. No `check-domain-availability` and no bulk call before selection; suggestions carry only `domain` and `premium`. The Generator's "available" therefore rests on `suggest-domains` and its documented contract. Observed 3 November.
- Re-check at selection: not recorded. UNKNOWN.

**Shared by the web doors**
- `POST S/suggested-tld-display-prices` (body `{}`) gives standard prices; `POST S/display-prices` gives tile prices on the Storefront. Verified\*. Deferred.
- `GET W/_api/user-domains/v1/user_domains/{domain}?domainName=` answers "is this domain in my account": anonymous 401 `DOMAINS_UNAUTHENTICATED`, logged in for a domain not owned 404 `DOMAINS_NOT_FOUND`. Observed.
- `POST S/insights/match-labels` with `{domains[], labels[]}` returns one marketing label per domain. Tile badges: Assumed.
- Anonymous access: every door call answered except `user_domains` (401), `domain-broker-offers` (500) and the purchase step (sign-in page). Observed.

## 4. Logged-in dashboard (not one of the four doors)

`manage.wix.com/my-domains`, search `Agenticqa.com`, 3 November. Observed.
- `GET /v2/check-domain-availability` and `GET /v2/suggest-domains`. The client sends `query` with a TLD (`Agenticqa.com`); the suggestions exclude the taken name.
- For the taken name: `POST /_serverless/domains-serverless-services/can-change-domain-owner` → `canChangeOwner: false`; `user_domains` → 404; `POST /_api/wix/domainTransferInValidation` (form `domainName=`) → 200, `text/javascript`, `status: -987`, message with `&#039;` instead of an apostrophe.

## 5. Finding candidates

Not findings. Re-verify, then keep at most 5.

| # | Candidate | Re-verify with |
|---|---|---|
| 1 | Public API returns 200 without a key and with an invalid key; the documentation and the assignment require a key | Same request with the real key: status, body, headers |
| 2 | `premiumType: UNKNOWN_PREMIUM_TYPE` is outside the documented enum, including with `premium: true` (`google.biz`, `google.art`, web bulk) | Same domains through the public API |
| 3 | A type error in `paging.limit` gives a generic parse message without the field; a range error is structured | Low severity, developer experience |
| 4 | Generator console error `borderColor=""` and a transparent red border `rgba(255,0,0,0)` | Whether the user sees any error signal |
| 5 | `whois` returns 403 when logged in | Screen; outside anonymous test conditions |
| 6 | `domainTransferInValidation` reports an error inside a 200 body, with `&#039;` in the text | Screen; logged in only |
| 7 | Documentation: auth header unclear; `paging.limit` minimum stated as 0 and 1 | Direct links to the doc pages |

## 6. Open questions

- Public API behaviour with a real key, and the required headers.
- Whether the public API and the web endpoints share a backend.
- How `suggest-domains` decides that a domain is available.
- Whether the Generator re-checks availability at selection.
- Why input without a TLD produced different call sets.
- The checkout URL.
- Behaviour outside Israel.

## 7. Carried-over constraints

- API budget: the assignment allows "a few hundred" calls in total. About 200 were used during exploration (estimate).
- HAR exports from this exploration contain `x-xsrf-token`. Never commit them.
- Postman: no body on GET; explicit No Auth for the no-key test; clear `wixapis.com` cookies before each variant; keep the key only in a secret variable's Current value.
