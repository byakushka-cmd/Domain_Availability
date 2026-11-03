# Agent rules for this repo

Sources of truth, in order: `ASSIGNMENT.md`, then `WIX_DOMAINS_OBSERVATIONS.md`. Both are local only and git-ignored, so deliverables cite evidence inline (level and date), never "see observations". If a request conflicts with `ASSIGNMENT.md`, stop and say so.

- Never buy, select a suggested domain, or navigate to checkout or sign-in. Tests search and read only.
- No load testing, brute force or scraping. The public API client stops at 15 calls per run (`tests/support/wix-api.ts`). About 200 calls were used before this repo; the assignment allows a few hundred in total.
- Public pages only. Web tests run in a fresh browser context without login.
- The key comes only from `WIX_API_KEY` (`playwright.config.ts` loads `.env`). Never open, print or log `.env` or the key. Never commit `.env`, reports, traces or HAR files.
- No invented findings, contracts or results. Every claim carries an evidence level (Documented, Verified, Observed, Assumed, UNKNOWN) and a date. Gaps stay UNKNOWN.
- In web tests, assert what the screen means, not exact wording or which internal calls happen; both vary between loads.
- Minimal code: no abstraction a test does not need. No emojis or filler.
- Commit as you go. Never squash or rewrite history.
