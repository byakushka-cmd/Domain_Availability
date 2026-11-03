# Agent rules for this repo

Sources of truth, in order: `ASSIGNMENT.md`, then `WIX_DOMAINS_OBSERVATIONS.md`. Both are local only and git-ignored, so deliverables cite evidence inline (level and date), never "see observations". If a request conflicts with `ASSIGNMENT.md`, stop and say so.

- Never buy, select a suggested domain, or navigate to checkout or sign-in. Tests search and read only.
- No load testing, brute force or scraping. The public API client stops at 15 calls per run (`tests/support/wix-api.ts`).
- Public pages only. Web tests run in a fresh browser context without login.
- The key comes only from `WIX_API_KEY` (`playwright.config.ts` loads `.env`). Never open, print or log `.env` or the key. Never commit `.env`, reports, traces or HAR files.
- No invented findings, contracts or results. Every claim carries an evidence level (Documented, Verified, Observed, Assumed, UNKNOWN) and a date. Gaps stay UNKNOWN.
- In web tests, assert what the screen means, not exact wording or which internal calls happen; both vary between loads.
- Minimal code: no abstraction a test does not need. No emojis or filler.

## Controlled execution

1. Work in small, isolated, single-purpose steps.
2. Before every step, state what, why, and which files it affects.
3. Wait for explicit approval.
4. Execute only the approved step.
5. Report changes, validation results and evidence.
6. Stop before the next step.
7. One approval authorizes one step only.

## Git control

- Never commit or push without explicit approval.
- Each commit and each push needs its own approval.
- Never squash, rewrite history or force-push without explicit approval.
- Preserve the existing Git history.

## Quality and scope

- No autonomous multi-step execution.
- No refactoring or features beyond the approved step.
- Never claim tests passed unless they were executed and passed.
- Keep implementation, execution and verification separate in every report.
- Preserve existing working code unless a change is approved.
- Avoid redundant investigation and unnecessary API calls.
- Respect the assignment's 3-hour budget, measured from the first commit to the last.

## Current project state

- `FINDINGS.md` (uncommitted) has an unverified test-pass claim in F5 that needs separate review.
