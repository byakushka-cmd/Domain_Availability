> Verbatim text of the original assignment, `# QA Engineer, Wix Domains_ Home Assignment.docx`, extracted with macOS textutil on 2026-11-03. The .docx is the source of truth.

# QA Engineer, Wix Domains: Home Assignment

**Time:** up to 3 hours, from your first commit to your last.
**Submit:** a link to a public GitHub repo.
**Next step:** you present your work to the hiring manager and the Wix QA guild.

---

## Read this first: you own every line

AI is **required** for this assignment. Use any coding agent or AI tool you like, as much as you like.

But you own every line it produces. Review, correct and cut before you submit. In the presentation we'll point at any line in your repo and ask why it's there. "The AI wrote it" is not an answer.

We're hiring a QA who directs AI, not one who forwards its output.

---

## The scenario

A user wants to know one thing: **"Can I get this name?"** At Wix there are four doors that answer it:

| Door | Where |
|---|---|
| Domain storefront | https://www.wix.com/domains |
| Business Name Generator | https://www.wix.com/tools/business-name-generator |
| WHOIS lookup | https://www.wix.com/domains/whois |
| Public Domain Search API | https://dev.wix.com/docs/api-reference/account-level/domains/domain-search/introduction |

Imagine you're joining tomorrow as the QA owner of these surfaces. Show us how you'd understand them, plan their testing, test them and automate them.

---

## Domain basics

This is context, not a list of test cases. It's here so you don't spend your time reporting expected behavior as bugs.

- **Wix doesn't sell every TLD.** A TLD is the ending, like `.com` or `.co.il`. A name can be free at the registry and still not be for sale on Wix.
- **API input formats differ.** In the API, a domain must include its TLD (`mybakery.com`), but the TLD filter is passed without the dot (`com`, not `.com`).
- **Premium domains cost more** than the standard price for their TLD. Sometimes the higher price applies only in the first year, sometimes on renewal too.
- **Prices, currency and some suggestions depend on where you are.** For example, a visitor in Israel may be offered `.co.il` names that a visitor elsewhere won't see.
- **Suggestions are generated,** so they can differ between calls and between doors.
- **WHOIS data for most registered domains is redacted** for privacy. That's normal.
- **Availability is a point-in-time answer.** A name that's free now can be taken a minute later.
- **To call the public API you need an account-level API key.** Create a free Wix account, then generate a key at https://manage.wix.com/account/api-keys. Your key is a secret.

---

## What to do

The time boxes are guidance. Partial and honest beats complete and padded.

### 0. Setup (about 10 min)
- Create a public repo, your Wix account and your API key.
- Keep the key out of git.

### 1. Understand the system (about 35 min) → `ARCHITECTURE.md`
- Use the browser's developer tools on the three web doors.
- Explain what each door is made of, which network calls it makes and what each call drives on the screen.
- Explain how the doors relate to each other and to the public API.
- Include a diagram of the doors, the services they call and how those connect. Any tool is fine; Mermaid works well in GitHub.

### 2. Test plan (about 40 min) → `TEST_PLAN.md`
- Write the test plan you'd want before owning these surfaces.
- Your scope, your approach, your format.
- Explain what you prioritized and why, and what you deliberately left out.

### 3. Explore and report (about 30 min) → `FINDINGS.md`
- Up to 5 findings, each with evidence and a **severity and priority** you can defend.
- If you find no real bug, report risks and observations instead.
- Don't invent bugs.

### 4. Automation (about 55 min) → your test code
- Any language, any framework.
- Cover the public API and at least one web door.
- It must run with a single command documented in your README.
- What to automate, how deep to go and how to structure it are your call. Explain your choices.

### 5. Wrap-up (about 10 min) → `README.md` and `AI_LOG.md`
- **`README.md`:**
  - How to run your tests.
  - What you'd do with another week.
  - Your quality strategy for Wix Domains, in 5 lines.
- **`AI_LOG.md`:**
  - Which AI tools you used and your key prompts.
  - Where the AI was wrong and how you caught it.
  - What you changed or threw away.
  - What you chose *not* to hand to AI.
  - Commit any agent configuration you wrote, such as `CLAUDE.md`, `AGENTS.md` or rules files.

---

## Rules

- **Never complete a purchase.** Browsing and searching are fine. Stop before checkout.
- **No load testing, brute force or scraping.** Keep API calls to a few hundred in total.
- **Test public pages and your own account only.**
- **Never commit your API key.**
- **Keep your real commit history.** Commit as you go and don't squash. We read the commit trail.

## Submitting

1. Review the whole repo yourself one last time. Everything in it is yours to defend.
2. At the top of your `README.md`, write how long you spent in total.
3. Send us the repo link.

## The presentation

You present your work to the hiring manager and the Wix QA guild, then take questions.

Be ready to:
- Walk through any file.
- Defend any line.
- Change something live, with your AI tools, in front of us.

Good luck. We're looking forward to seeing how you think.

