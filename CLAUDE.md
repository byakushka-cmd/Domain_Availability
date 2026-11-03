# Agent rules for this repo

Sources of truth, in order: `ASSIGNMENT.md`, then `WIX_DOMAINS_OBSERVATIONS.md`. Both are local only and git-ignored, so deliverables cite evidence inline (level and date), never "see observations". If a request conflicts with `ASSIGNMENT.md`, stop and say so.

- Never buy, select a suggested domain, or navigate to checkout or sign-in. Tests search and read only.
- No load testing, brute force or scraping. The public API client stops at 15 calls per run (`tests/support/wix-api.ts`).
- Public pages only. Web tests run in a fresh browser context without login.
- The key comes only from `WIX_API_KEY` (`playwright.config.ts` loads `.env`). Never open, print or log `.env` or the key. Never commit `.env`, reports, traces or HAR files.
- No invented findings, contracts or results. Every claim carries an evidence level (Documented, Verified, Observed, Assumed, UNKNOWN) and a date. Gaps stay UNKNOWN.
- In web tests, assert what the screen means, not exact wording or which internal calls happen; both vary between loads.
- Minimal code: no abstraction a test does not need. No emojis or filler.

## Working mode

- Make the smallest reasonable change. Before it, say what, why and which files.
- Stop after each logical step and wait for approval. One approval covers one step.
- Never commit or push without explicit approval. Each commit and each push is approved separately.
- Never squash, rewrite history or force-push without explicit approval.
- Keep code simple and focused on the assignment. No unnecessary abstractions or refactoring.
- Report actual test results only. Never claim a test passed unless it ran and passed.
- No emojis or verbose explanations.
