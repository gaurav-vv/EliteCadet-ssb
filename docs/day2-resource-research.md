# Day 2 Psychology Resource Research

**Purpose:** Research-only pass to identify external resources EliteCadet can link students to for **Day 2 SSB Psychology** preparation — TAT, WAT, SRT, SD/SDT, and full Day 2 mock practice. No application code was modified as part of this work.

**Date:** 2026-09-21
**Companion file:** [`docs/day2-resource-catalogue.json`](./day2-resource-catalogue.json) — the full structured dataset behind this report (39 resources, one JSON object each).

**Method:** Four research passes were run in parallel: (1) a deep crawl of the seed source `afpa.in`, (2) a deep crawl of the seed source `targetssb.in`, (3) independent web research for TAT + WAT resources, and (4) independent web research for SRT + SDT + full-Day-2 resources. Every candidate URL was actually fetched (not assumed from a search snippet) before being included, and each is marked with its own `verification_status`. No copyrighted text (stories, word lists, situations, sample answers) was reproduced anywhere in this research — descriptions below are written in original wording, and where content could not be verified first-hand, that is stated explicitly rather than guessed.

---

## 1. Seed sources: what they actually are

### AFPA (afpa.in)

AFPA is a real, credible **private coaching academy** — not an official or government body. It is run by **Dr. (Cdr.) N.K. Natarajan (Retd.)**, a retired Indian Navy Commander, with a faculty of 18+ retired officers, several stated as DIPR (Defence Institute of Psychological Research)-trained. The site is explicit about not being government-affiliated and states outright that it cannot guarantee SSB success — a good trust signal.

However, for Day 2 psychology content specifically, **every relevant page on the site is a sales page**: a paid coaching-and-evaluation program, a paid e-book, or a paid video course. We cross-checked this against AFPA's full WordPress sitemap (43 URLs total) to confirm — there is no free TAT/WAT/SRT/SDT explanation, no free practice material, and no interactive or timed practice tool anywhere on the domain. AFPA is therefore usable only as a **paid-option pointer**, not as a source of free explanatory or practice content.

### Target SSB (targetssb.in)

Target SSB turned out to be a **client-side single-page app gated behind Clerk authentication**. Every URL on the domain — including the `/read/TAT`, `/read/WAT`, `/read/SRT`, `/read/SD` pages that looked, from the outside, like exactly what we needed — returns HTTP 200 but with **no content rendered server-side**; everything loads via JavaScript after login. We confirmed this is not a fluke: the `/read/{slug}` route is an **unvalidated catch-all** — requesting a nonsense slug like `/read/ZZZNOTATOPIC123` also returns HTTP 200 with a plausible-looking title. That means a "200 OK" from this site is not evidence that real content exists at a given URL.

We could not find any founder/credential information either, for the same reason (the `/about` page is equally empty server-side). Third-party sources (Play Store mirrors, company-profile sites) suggest the site and its companion Android app are run by **Codepur**, a small independent developer, not an established coaching institute — with no visible ex-SSB-assessor or psychologist credentials behind the content.

**Recommendation: do not link to targetssb.in pages** in their current form. If EliteCadet wants to use this source, a follow-up pass with authenticated browser automation (not static fetching) would be needed to confirm real content exists and assess its quality — this research could not do that safely or honestly.

---

## 2. Research coverage by category

All resources below are catalogued in full in `day2-resource-catalogue.json`, with one JSON record per resource carrying `title, source_name, source_url, resource_type, category, subcategory, short_original_description, free_or_paid, level, quality_notes, credibility_notes, copyright_or_usage_notes, can_link_safely, can_summarize_safely, has_interactive_practice, has_downloadable_material, last_verified_date, verification_status, inclusion_status`, and `inclusion_notes`.

### TAT (8 resources investigated, 1 excluded)

| ID | Title | Source | Type | Status |
|---|---|---|---|---|
| T01 | What is Thematic Apperception Test (TAT) In SSB Interview | SSBCrack | article | recommended |
| T02 | TAT and PPDT Story Writing Tips | SSBCrack | article | recommended |
| T03 | Free TAT & PPDT Picture Practice with Timer | SSB Arena | practice_tool | recommended |
| T04 | TAT — Free Mock Series | DOSPDP (Col PP Vyas, Retd.) | mock_test | recommended |
| T05 | Some Tips for Stories in TAT | No Frills Academy (Col MM Nehru, Retd.) | article | recommended |
| T06 | TAT Practice Pictures for SSB Interview | The Cavalier | practice_tool | recommended |
| T07 | How to Write Good TAT Stories for SSB — Complete Guide | Alpha NDA Academy | article | **excluded — templated/SEO** |
| F15 | Read Materials on TAT | Target SSB | article | **excluded — unverifiable** |

**Gaps:** no resource found that cites peer-reviewed psychometric research on TAT specifically; several small-coaching-site TAT listicles (of which T07 is one representative example) were structurally near-identical to each other and were treated as one excluded data point rather than duplicated in the catalogue.

### WAT (7 resources investigated)

| ID | Title | Source | Type | Status |
|---|---|---|---|---|
| W01 | WAT Word Association Test — Examples & Explanation | SSBCrack | article | recommended |
| W02 | WAT — Free Mock Series | DOSPDP (Col PP Vyas, Retd.) | mock_test | recommended |
| W03 | WAT Words for SSB: Practice Words & Tips | NCA Academy (Hartaj Dhaliwal) | article | recommended |
| W04 | Word Association Test (WAT) | How To Crack SSB (Ujjwal Chugh) | article | recommended |
| W05 | WAT Complete Guide for SSB | SSB Psych Test | article | recommended |
| W06 | WAT Practice — Timed with AI Analysis | Provers | practice_tool | usable_secondary (pricing unconfirmed) |
| F16 | Read Materials on WAT | Target SSB | article | **excluded — unverifiable** |

### SRT (5 resources investigated)

| ID | Title | Source | Type | Status |
|---|---|---|---|---|
| S01 | Instructions for Situation Reaction Test (SRT) | SSBCrack | article | recommended |
| S02 | 5 Easy Tips for Better SRT Responses | SSBCrackExams (Gauri Agarwal) | article | recommended |
| S03 | Situation Reaction Test (SRT) in SSB | The Cavalier | article | recommended |
| S04 | 10 Tricky Situation Reaction Test (SRT) Questions | SSBCrackExams | article | recommended |
| F17 | Read Materials on SRT | Target SSB | article | **excluded — unverifiable** |

**Note:** SRT was the thinnest category for genuinely interactive/timed practice tools outside the Full Day 2 platforms (F01/F02) — no SRT-specific standalone simulator (distinct from the multi-test platforms) was found.

### SD/SDT (5 resources investigated)

| ID | Title | Source | Type | Status |
|---|---|---|---|---|
| D01 | Self-Description Test (SDT): How to Write It Honestly & Effectively | Victor Growth | article | recommended |
| D02 | 20 SDT Templates to Practice for SSB Interview | Victor Growth | article | usable_secondary (memorization risk) |
| D03 | What Is Self Description Test (SDT) in SSB? | SSBCrackExams | article | recommended |
| D04 | Self Description Test (SDT) | How To Crack SSB (Ujjwal Chugh) | article | recommended |
| F18 | Read Materials on SD | Target SSB | article | **excluded — unverifiable** |

**Gap:** no resource found offers a genuinely structured, guided self-reflection *exercise* for SDT beyond "ask your parents/friends what they think" — this is a real content gap EliteCadet could fill with original material (see §6).

### Full Day 2 (14 resources investigated, after excluding the 4 Target SSB `/read/` pages already listed under their respective test categories above)

| ID | Title | Source | Type | Status |
|---|---|---|---|---|
| F01 | SSB Psychological Test Online Platform (Full Mock) | ssbpsychtest.in (VKB Academy) | mock_test | **recommended — best full mock found** |
| F02 | SSB Practice — Free Multi-Test Simulator | ssbpractice.in | practice_tool | recommended |
| F03 | SSB Psych Test Simulator | Independent developer (Sumit Rai) | practice_tool | usable_secondary |
| F04 | Live Psychology Test Practice — TAT/WAT/SRT/SDT | Major Kalshi Classes (YouTube) | video | recommended (partially verified) |
| F05 | Day 2 Psychology Test (overview) | SSBCrack | article | recommended |
| F06 | Common Instructions for Interview at All SSBs | Indian Army (official, joinindianarmy.nic.in) | official_information | recommended |
| F07 | Psych Test Mastery (paid evaluation program) | AFPA | course | usable_secondary (paid) |
| F08 | Psychology for SSB Interview (e-book) | AFPA | book | usable_secondary (paid) |
| F09 | SSB Interview Video Lectures | AFPA | course | usable_secondary (paid, scope unclear) |
| F10 | Psych Test (legacy page) | AFPA | course | **excluded — duplicate of F07** |
| F11 | Videos — Interview Experience Library | AFPA | video | **excluded — not test-specific** |
| F12 | AFPA FAQs | AFPA | article | **excluded — thin/logistics only** |
| F13 | Psychology for SSB Interview (Goodreads listing) | Goodreads / attributed to N.K. Natarajan | book | **needs verification — attribution conflict** |
| F14 | Target SSB Android app (Codepur) | Google Play | practice_tool | **needs verification — unverifiable second-hand** |

---

## 3. Totals

- **Total resources investigated:** 39 (well above the 20–30 minimum requested; investigated across 4 parallel passes plus deep crawls of both seed sites)
- **By category:** TAT 8 · WAT 7 · SRT 5 · SDT 5 · Full Day 2 14
- **By resource type:** article 22 · practice_tool 6 · mock_test 3 · course 3 · video 2 · book 2 · official_information 1
- **By inclusion status:** recommended 23 · usable_secondary 6 · needs_verification 2 · excluded_low_quality 3 · excluded_unverifiable 4 · excluded_duplicate 1
- **By free/paid:** free 24 · paid 5 · mixed/freemium 3 · unknown 7 (mostly interactive tools that didn't disclose pricing on the page fetched)

---

## 4. Duplicates, low-quality pages, and copied-content flags

- **F10** (`afpa.in/old-psychtest/`) is a near-duplicate of **F07** (`afpa.in/psychtestmastery/`) — a retained legacy URL selling the identical program. Excluded; F07 is the canonical link.
- **F04** (Major Kalshi Classes YouTube video) was independently surfaced by *both* the TAT/WAT pass and the SRT/SDT/Full-Day-2 pass under the same URL. Merged into a single Full Day 2 entry rather than listed twice.
- **T07** (Alpha NDA Academy) is flagged as **templated/SEO-only**: repetitive bullet structure, heavy internal self-promotion links, no case studies, and a structure that closely mirrors several other small coaching-site TAT articles found during research (Centurion Defence Academy, Shield Defence Academy, Senaabhyas, and others were also observed converging on the same "5–7 tips" template but were not individually catalogued once the pattern was clear). This is flagged as a genre convention across many small sites, not necessarily direct copying from one specific source — but the content offers no incremental value over T01/T05 and should not be used.
- **F13** (Goodreads listing) has a **real attribution conflict**: one source describes the author as a retired *Group Captain* (an Air Force rank), while AFPA's own site describes its founder — who may or may not be the same person — as a retired Navy *Commander*. It's also unclear whether this is the same book as AFPA's own e-book (F08). This needs a human to manually resolve before EliteCadet cites it. **Do not publish any authorship claim about this book without that check.**
- **F14** (Target SSB Android app) could not be verified first-hand — the Play Store page itself failed to load fully via automated fetch, so this entry rests entirely on third-party app-index mirrors and search snippets. Flagged `needs_verification`.
- **F11, F12** (AFPA video index, AFPA FAQs) are real, live, freely-readable pages — but neither is substantively about Day 2 psychology testing (one is a general exam-type video index, the other is admissions/logistics FAQ). Excluded as not relevant rather than as low-quality writing.
- The large tier of small coaching-academy blogs (Alpha NDA Academy, Centurion Defence Academy, Shield Defence Academy, and similar) converges on nearly identical SRT/SDT "format" numbers (60 situations/30 min, 5 paragraphs/15 min) and near-identical structural advice across sites — consistent with shared/derivative source material circulating across the SSB-coaching content ecosystem rather than independently authored research. None of these cite a named psychologist as the actual source of the format claims; SSBCrack/SSBCrackExams content, while also commercial, at least carries a consistent, long-running editorial identity.

---

## 5. Free vs. paid

**Free (24):** SSBCrack/SSBCrackExams articles (T01, T02, W01, S01, S02, S04, D03, F05), No Frills Academy (T05), SSB Arena (T03), DOSPDP/Col Vyas mock series (T04, W02), NCA Academy (W03), How To Crack SSB (W04, D04), SSB Psych Test article (W05), Victor Growth (D01, D02), The Cavalier SRT article (S03), ssbpractice.in (F02), SSB Psych Test Simulator (F03), Major Kalshi Classes video (F04), Indian Army official PDF (F06).

**Paid (5):** AFPA's three product pages (F07 course/evaluation, F08 e-book, F09 video course), plus the Goodreads-listed book (F13, needs verification) and, implicitly, any paid tier inside the freemium tools.

**Mixed/freemium (3):** ssbpsychtest.in (F01 — free core practice, paid PDF export), WAT guide on the same domain (W05, same freemium platform), Target SSB app (F14, per third-party listings — unverified).

**Unknown / undisclosed (7):** mostly interactive tools whose pricing wasn't stated on the page fetched (W06 Provers, T06 The Cavalier's specific practice-pictures page) and the four excluded Target SSB `/read/` pages plus F09's actual depth.

---

## 6. Recommended for beginners

The clearest **beginner on-ramp** set, in suggested reading order:

1. **F05** — SSBCrack's Day 2 overview (orients a first-time visitor to all four tests at once)
2. **T01** (TAT), **W01** (WAT), **S01** (SRT), **D03** (SDT) — one solid beginner explainer per test, all free, all from established portals
3. **T03 / T04 / W02 / F02** — free interactive tools to move from reading to actually practicing under time pressure

---

## 7. Recommended for actual practice (not just theory)

Resources that let a student *do* something, not just read:

- **F01** (ssbpsychtest.in) — the only genuine **full combined Day 2 mock** found, free core tier
- **F02** (ssbpractice.in) — free, no-signup, per-test strict-mode timer
- **T03** (SSB Arena), **T04/W02** (DOSPDP), **F03** (Sumit Rai's simulator) — free timed practice tools
- **W06** (Provers) — the only tool offering automated feedback on response quality, not just timing (pricing unconfirmed)
- **T06** (The Cavalier) — picture practice with model-story scaffolding

## 8. Recommended for timed simulation specifically

**F01 (ssbpsychtest.in)** is the strongest single answer — it has a dedicated "Full Mock" mode chaining all four tests with correct SSB timings. **F02 (ssbpractice.in)** is the best per-test strict-timing companion. **T04/W02 (DOSPDP)** are the best-credentialed free timed mocks for TAT and WAT individually.

---

## 9. Resources requiring further human verification before use

- **F13** — Goodreads book listing: resolve the author-identity/rank conflict and confirm whether it's the same book as F08 before citing.
- **F14** — Target SSB Android app: install and review directly; current entry rests only on third-party mirrors.
- **F04** — Major Kalshi Classes YouTube video: page metadata confirmed, but the actual on-screen content/pacing was not reviewed frame-by-frame; spot-check before featuring prominently.
- **F06** — Indian Army official PDF: confirmed to exist on the official domain, but its internal text could not be machine-extracted; a human should open and read it before we write any summary of its specific contents.
- **targetssb.in generally** — would need authenticated browser automation to assess fairly; static fetching could not confirm any content exists behind its login wall.

---

## 10. Copyright / usage concerns

- No TAT pictures, WAT word lists, SRT situations, or SDT sample answers were reproduced anywhere in this research or in the catalogue — every `short_original_description` field is original wording describing what a resource *contains*, not a copy of its content.
- **D02** (Victor Growth's 20 SDT templates) provides finished sample paragraphs rather than blank prompts. If linked, EliteCadet's own page should carry an explicit "these are models to learn from, not scripts to memorize" caveat — the same caution AFPA's own e-book page (F08) states for its own examples, which is worth echoing.
- **F07/F08/F09** (AFPA paid products) are all safe to link to (they're the vendor's own public sales pages) but their actual paid content could not be assessed — do not make quality claims about material we haven't seen past the paywall.
- **T07** and the broader tier of near-identical small-coaching-site listicles are flagged as likely derivative/templated content circulating across multiple domains — recommend not linking to more than one representative example from that tier, and preferring named-author sources (T05, W03, W04, D04, S02) over anonymous brand-only ones where equivalent content exists.
- **targetssb.in** — because no content could be verified, we cannot rule out that it either reproduces material from elsewhere or is thin/incomplete; excluded pending verification rather than assumed either way.

---

## 11. Shortlist: 10–15 resources recommended for EliteCadet

| # | Resource | Category | Why |
|---|---|---|---|
| 1 | **F05** — Day 2 Psychology Test overview (SSBCrack) | Full Day 2 | Best single orientation page; free, accurate, no fluff — ideal landing point before students branch into individual tests |
| 2 | **T01** — What is TAT? (SSBCrack) | TAT | Strongest free beginner TAT explainer; goes further than most by naming real scoring frameworks |
| 3 | **T05** — Some Tips for Stories in TAT (No Frills Academy, Col MM Nehru Retd.) | TAT | Named, retired SSB-selector author — the single strongest individual-expert credibility signal found for TAT |
| 4 | **T04** — TAT Free Mock Series (DOSPDP, Col PP Vyas Retd.) | TAT | Free, timing-accurate, run by a named retired officer with a track record — no upsell funnel |
| 5 | **T03** — Free TAT & PPDT Picture Practice (SSB Arena) | TAT | Genuinely free, interactive picture practice with no signup — fills the "picture practice" gap |
| 6 | **W01** — WAT Word Association Test: Examples & Explanation (SSBCrack) | WAT | Best free beginner WAT explainer |
| 7 | **W02** — WAT Free Mock Series (DOSPDP, Col PP Vyas Retd.) | WAT | Same trusted, credentialed, free operator as #4 — five distinct timed mock sets |
| 8 | **W03** — WAT Words for SSB: Practice Words & Tips (NCA Academy, Hartaj Dhaliwal) | WAT | Named author, pairs practice word sets with real technique guidance rather than a bare list |
| 9 | **S01** — Instructions for SRT (SSBCrack) | SRT | Accurate, concise free format explainer |
| 10 | **S02** — 5 Easy Tips for Better SRT Responses (SSBCrackExams, Gauri Agarwal) | SRT | Named author, actionable response-writing principles, not generic filler |
| 11 | **D01** — Self-Description Test: How to Write It Honestly & Effectively (Victor Growth) | SDT | Best explanation *plus* a genuine self-reflection preparation method — the closest thing to a real reflection exercise found anywhere in this research |
| 12 | **D03** — What Is SDT? (SSBCrackExams) | SDT | Explains the *why* behind SDT (cross-checking self-perception against other tests/PIQ), not just the format |
| 13 | **F01** — SSB Psychological Test Online Platform / Full Mock (ssbpsychtest.in) | Full Day 2 | The one genuine free, continuous, correctly-timed TAT→WAT→SRT→SD mock found across all four research passes |
| 14 | **F02** — SSB Practice free multi-test simulator (ssbpractice.in) | Full Day 2 | Best free per-test strict-timing companion tool, no signup |
| 15 | **F06** — Common Instructions for Interview at All SSBs (Indian Army, official) | Full Day 2 | The only genuinely official-tier source found; worth linking as a credibility/legitimacy anchor even though its specific psychology-test content needs manual review before summarizing |

**Deliberately left out of the shortlist but worth keeping in the catalogue as secondary options:** the three AFPA paid products (F07–F09, fine to list under a clearly-labeled "paid options" section), W06/Provers (AI feedback is interesting but pricing unconfirmed), D02/Victor Growth's SDT templates (useful with a memorization-risk caveat), and F04/Major Kalshi Classes video (strong candidate once someone has actually watched it to confirm pacing/quality).

---

## 12. What was NOT done (by design)

- No application code, components, routes, or data files were modified.
- No copyrighted content (stories, word lists, situations, sample answers, book text) was copied, scraped, or reproduced.
- No resource was invented or assumed to exist without being actually fetched and checked.
- targetssb.in was not force-included despite being a named seed source, because its content could not be honestly verified with the tools available.
