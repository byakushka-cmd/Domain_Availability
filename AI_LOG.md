# AI log

## Tools

- **Claude Code** (desktop app, Claude Opus 5.5): coding agent for the repo, docs and tests.
- **Playwright MCP**: live exploration of the three web doors, including response substitution to prove which call drives which part of the screen.
- **Postman**: used by the author for manual API checks (no-TLD and space-in-domain cases); the author passed the results to Claude Code as screenshots.
- **ChatGPT and Claude**: used by the author during the exploration on 2–3 November, before this repo; the prompts from those sessions are not reproduced here.

## Key prompts (this session)

- The opening brief: role, sources of truth in order, P0 / P1 / Deferred, safety rules (no purchase, call budget, key only in `WIX_API_KEY`), and "stop before the first commit and wait for approval".
- "Start with 4 doors and unauthorised user", then "start unauthorised then we will compare": shaped the flow structure of the plan and the API spec.
- "Don't push anything without my approval", then the controlled-execution rules now in `CLAUDE.md`.
- "Perform" the risk mitigation "both answers are taken within seconds": became the measured web-to-API gap check.
- The TLD request with Postman screenshots, and "consistent with the error-messages page": became the space-domain test and the reworked F3.

## Where the AI was wrong, and how it was caught

| What the AI did | How it was caught | Fix |
|---|---|---|
| Wrote in F5 that two tests "passed" before they existed | Author's review ("stop, let me verify") | Line rewritten to match real runs; rule "report actual test results only" in `CLAUDE.md` |
| Committed the assignment text and the observations file to the public repo in the first commit | Author asked to keep them out | Untracked and git-ignored; they remain in the history of the first commit, which was not rewritten |
| Pushed early commits without asking each time | Author set the rule | Every commit and push now needs approval |
| Storefront test typed into the header's search box and clicked the hero's button | Failing run and its page snapshot | Locators scoped to `<main>` |
| Assumed a click works right after `load` | Searches were ignored in runs and in MCP | Retry the search until the page navigates |
| WHOIS test read a response body discarded by navigation | Failing run; MCP logging of the call order | Match the call made by the result page. This also showed that the WHOIS entry page, not the result page, decides the branch |
| Redaction check used a heading that was not rendered yet | Failing run | One retrying `toContainText` assertion |
| Read the space-domain 400 as simply "rejected" | Author's Postman check against the error-messages page | Asserted as documented with `test.fail()`; F3 rewritten against the error-messages page |
| Counted "11 API tests" where it meant calls | Own audit | Corrected in `TEST_PLAN.md` |
| Wrote in `README.md` that the API spec has 12 tests and 9 passed; it has 11 tests (12 calls) and 8 passed plus 3 expected failures | Final check against `npx playwright test --list` and the run output | Corrected in `README.md` |
| Assumed the result URL always has a slash (`/domain/result/?q=`); the Storefront also lands on `/domain/result?q=` | The author's full run in the terminal failed on the URL check | Both forms accepted in `storefront.spec.ts` and `whois.spec.ts` |
| Started a full run while the author was running `npm test` in the terminal; both runs shared `test-results/`, so each deleted the other's traces and they shared the call counter | `ENOENT` errors and an early budget stop; confirmed by reading the author's terminal | One run at a time; the two overlapping runs used about 28 API calls |
| Reported a risk and undocumented behaviour as findings next to real bugs | The author's rule: a bug needs an expected result from the Wix documentation or the assignment | `FINDINGS.md` keeps four documented bugs; the rest moved to `OBSERVATIONS.md` |
| The "another week" plan left out untested documented API cases, the UI observations, the selection path and browsers | The author asked whether it was thorough | Four items added; the mobile viewport item dropped at the author's request |

## Changed or thrown away

- Dropped: comparing full bodies between no-key and real-key calls (over budget); the verdict is compared instead, and F1 keeps the body evidence.
- Dropped: a text-slicing redaction check; generic "first visible" locators.
- Kept out of the suite: response substitution (used only to prove call-to-screen links during exploration).
- `CLAUDE.md` went through three versions; the current one is short and keeps every safety rule.
- Added `npm run test:web:headed` so the UI tests can be watched; the default stays headless.

## Not handed to the AI

- Creating the API key and writing `.env`; the agent never opened it.
- Manual Postman verification of the TLD and error cases.
- The logged-in dashboard capture in the author's own account.
- Every commit and push decision.
