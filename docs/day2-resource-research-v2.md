# Day 2 Psychology Resource Research — v2 (Comprehensive Pass)

**Purpose:** Second, deeper research pass building on [`docs/day2-resource-research.md`](./day2-resource-research.md) (v1, 39 resources, article-heavy). This pass verifies actual **practice, timing, test-series, full-mock, and feedback capabilities** across SSB Day 2 psychology platforms, not just whether an explanation page exists. No application code was modified.

**Date:** 2026-09-21
**Companion file:** [`docs/day2-resource-catalogue-v2.json`](./day2-resource-catalogue-v2.json) — 80 structured resource records + 5 explicitly excluded/flagged entries, in a UI-ready schema.

**Method:** Four parallel deep-verification research passes:
1. Capability audit of ssbpsychtest.in, DOSPDP, AFPA, SSBCrack/SSBCrackExams, SSB Psych Prep
2. Examples/demonstrations discovery + rigorous AI-vs-human feedback claim verification
3. Discovery of new platforms via the specific search queries requested (Play Store searches, "AI evaluation," "test series," etc.)
4. Capability audit of Target SSB, SSB Practice, SSB Buddy, Calm Chase, WishWas

Every entry was actually fetched — direct HTML, raw Play Store listings, or cross-corroborated search snippets — rather than assumed from marketing copy. Where a claim could not be independently verified, that is stated explicitly in the entry's `verification_status`/`limitations` rather than presented as fact. No TAT pictures, WAT word lists, SRT situations, SDT samples, or copyrighted question banks were reproduced anywhere in this research.

---

## 1. What changed since v1

v1 was built mostly from generic advice articles. This pass corrects that by verifying actual mechanics — set counts, exact timing, practice/test mode distinctions, and (critically) whether "AI feedback" and "expert feedback" claims hold up under direct inspection. Headline corrections:

- **Target SSB Android app**: v1 could not load the Play Store page and marked it `needs_verification`. v2 fetched the **live** listing directly (2026-09-21): 100K+ downloads, 4.84/5 from 6,091 ratings, exact TAT (11 pics+blank, 30s/4min), WAT (60 words, 15s), SRT (60 situations, 30s gap) timing — all confirmed. A third-party tracker's claim that the app was "unpublished since March 2024" was checked directly and found to be **stale/incorrect**. Important: this is the **app**, not the website — see below.
- **targetssb.in (website)**: unchanged from v1 — still a login-gated, unverifiable single-page app whose `/read/{slug}` route is an unvalidated catch-all. **Do not confuse the verified app with the unverifiable website**, even though they share a brand.
- **ssbpsychtest.in**: v1 described it generically. v2 pulled exact counts from its `/fixed_tests` page: **50+ TAT sets, 25 WAT sets, 25 SRT sets, but only 1 SD set** (a real, confirmed gap), and 50+ Full Mock batteries — though the homepage states different, unreconciled aggregate numbers. Confirmed: **zero feedback of any kind** — it is purely a timer/prompt-delivery tool wearing a "Full Mock" label.
- **ssbpractice.in**: v2 confirms exact timing for all four tests including a previously-unknown **SD module** (5 prompts, single 15-min countdown), plus a new finding — downloadable printable PDF review sheets for every test.
- **AFPA Psych Test Mastery**: v2 names the four evaluators (Dr Cdr N.K. Natarajan, Lt Col Mahesh Gupte, Col Tarun Mitra, Ashok Kumar Thamburaj) and confirms the entire flow is email/phone-based with zero interactive web tooling — matches and extends v1's finding.
- **46 of 80 v2 entries are entirely new** (not in v1 at all) — mostly practice platforms, mobile apps, demonstration videos, and feedback services.

---

## 2. Capability-based organization

Per instruction, resources are grouped by **capability**, not ranked. A resource can and does appear in multiple groups.

### A. Learning resources (15)

Curated — not dozens of generic articles. Best few per test, prioritizing named/credentialed authorship:
TAT: R001, R002, R003 (Col MM Nehru, retired SSB selector) · WAT: R004, R005, R006, R007 · SRT: R009, R010, R011 (SRT complete guide, needs_verification) · SD: R012 (+ reflection method), R014, R015 · Full Day 2 overview: R016.

### B. Examples & demonstrations (11)

The single biggest quality upgrade over v1. Highlights:
- **R017, R018** — Maj Gen VPS Bhakuni (Retd.), former SSB Bangalore Commandant, critiquing real candidate TAT stories on video — the highest-credibility demonstration source found in either research pass.
- **R019, R020** — Ashok Kumar Thamburaj, ex-SSB psychologist, cross-corroborated across two independent sources (YouTube + AFPA's own faculty page).
- **R021** — Gp Capt AK Srivastava (Retd.), ex-Air Force Selection Board psychologist, credentials cross-verified across **four** independent sources — the strongest cross-verification in this entire research effort.
- WAT and SD demonstrations remain comparatively weak (R022–R026 are moderate-to-low confidence) — this is a real, confirmed content gap, not an oversight.

### C. TAT practice (15 entries)

Real practice tools with verified or partially-verified set counts and timing: R027 (SSB Arena, 30+ sets, free), R028 (DOSPDP mock series), R029 (Target SSB app, 11 pics+blank/series, live-verified), R045 (Cavalier, 12 images w/ model stories), R046 (SSB Practice, 12-slide, PDF export), R050 (WishWas, copyright flag — see §5), R054 (ssbpsychtest.in, **50+ sets**, strongest count found), R068 (Troppers, **20 full sets** w/ model answers), R030 (TATTests.me, AI report — product-fit flag, see §5), R031 (Aditya Thakur app).

### D. WAT practice (14 entries)

R032 (DOSPDP, 5 sets), R033 (Target SSB app, 60 words/series), R034/R035 (SSB Buddy, two *unrelated* products sharing a name — see §6), R036 (Calm Chase, unverified claims), R047 (SSB Practice, 60 words/15min), R051 (WishWas), R055 (ssbpsychtest.in, **25 sets of 60 = ~1,500 words**), R069 (Troppers, **10 full sets**).

### E. SRT practice (17 entries — the largest single-test group)

R038 (DOSPDP, **2 sets, 60 situations, 30 min — new finding this pass**, DOSPDP previously only known for TAT/WAT), R039 (Target SSB app), R040/R041 (SSB Buddy, two products), R042 (Calm Chase), R043 (NCA free live-coached trial), R044 (SSB OPAM Simulator — flagged as a *different instrument*, see §6), R048 (SSB Practice), R052 (WishWas), R056 (ssbpsychtest.in, **25 sets**), R070 (Troppers, **10 full sets**), R037 (Cavalier article), R009–R011.

### F. SD/SDT practice (9 entries — thinnest category, confirmed gap)

Only **R049 (SSB Practice)** and **R053 (WishWas)** offer genuinely dedicated, well-formed SD practice (5 prompts, single timer). **R057 (ssbpsychtest.in) has only 1 SD set** vs. 25–50+ for its other three tests. **DOSPDP has no SD section at all** (confirmed absence, see excluded_and_flagged_entries X05). **Target SSB app and SSB Buddy app both have no SD/SDT module.** Calm Chase's own schema.org "teaches" list omits SD/SDT entirely. This is the single clearest, most consistent gap across the whole research effort.

### G. Timed practice (29 entries carry this tag)

Every practice entry with a verified or claimed timer: DOSPDP (bell-timed, automatic), SSB Practice (Strict vs. Practice mode), ssbpsychtest.in (non-pausable, automatic), Target SSB app (Manual vs. Test mode), WishWas (auto-advancing), Troppers (unconfirmed whether truly timed vs. static), Provers (PPDT/TAT 30s+4min, WAT 15s/word, Lecturette 3min).

### H. Test series (17 entries)

Platforms offering genuinely **multiple, distinct sets** with verified counts: **ssbpsychtest.in** (50+ TAT / 25 WAT / 25 SRT — the largest verified banks found), **Troppers** (20 TAT / 10 WAT / 10 SRT with model answers), **SSB Buddy Android app** (200+ TAT / 450+ WAT / 120+ SRT, gamified), **DOSPDP** (5 WAT sets, 2 SRT sets), **SSB Arena** (30+ TAT/PPDT sets).

### I. Full Day 2 simulation (this pass's most important finding)

**R080 — ssbpsychtest.in's Full Mock mode** is the strongest finding across both research passes: a free, continuous, correctly-timed TAT→WAT→SRT→SD sequence (~1h48min total) with 50+ battery variants (though the homepage states a conflicting "20+" figure). **It still provides zero feedback** — purely a timing/prompt-delivery tool. No other platform was confirmed to offer a genuinely continuous, single-session, all-four-test mock; ssbpractice.in and WishWas offer the four tests as *separate* modules, not one chained sequence.

### J. AI feedback (10 entries claim it; confidence rated per-entry)

SSB Core AI, PsychSirAI, AI SSB, SSBGPT, SSBPrep.online, Calm Chase, TATTests.me, SSB OPAM Simulator, and Provers all claim some form of AI evaluation. **Provers is the best-evidenced of these** (one visible sample output on its landing page) but is still rated only LOW-MEDIUM confidence — no platform disclosed methodology, and none showed independently-verifiable evidence of live, response-varying analysis beyond marketing copy. See §5 for the full skeptical breakdown.

### K. Expert/human feedback (17 entries)

All named-individual feedback is **paid and offline/scheduled**: AFPA Psych Test Mastery (4 named evaluators), SSB Psych Prep (Cdr K Ramana Prasad, Retd.), ClearSSB (retired SSB-panel psychologists), NCA's paid tier. The free demonstration videos (R017–R021) offer expert *commentary* on example responses but not personalized feedback on a student's own submission. **No platform offers free, on-demand, personalized human feedback.**

### L. Video resources (13 entries)

R017–R022, R025, R026, R065 (Major Kalshi Classes) are the primary video finds; R021 (Gp Capt AK Srivastava's channel) is the highest-credibility video source.

### M. Books/PDFs (5 entries)

R059 (AFPA e-book, paid), R060 (Goodreads listing — unresolved attribution conflict, see v1), R066 (Indian Army official PDF).

### N. Mobile apps (9 entries)

R029/R033/R039 (Target SSB, verified live), R035/R041 (SSB Buddy app, small user base), R031 (Aditya Thakur), R072 (SSBWINGS), R062 (SSBCrackExams learning app), R075 (AI SSB).

### O. Free resources (49 entries)

The clear majority — most learning articles, DOSPDP, SSB Arena, SSB Practice, ssbpsychtest.in's core tier, WishWas, Target SSB app, Major Kalshi Classes video, the Indian Army PDF.

### P. Paid / freemium resources (23 entries: 5 paid + 18 freemium)

AFPA's three products, SSB Psych Prep, ClearSSB, NCA's paid tier — all paid human-feedback services. ssbpsychtest.in, Provers, Troppers, SSB Buddy website, SSBWINGS, SSBTEST — freemium practice platforms.

---

## 3. Resolving one direct conflict between research agents

One agent flagged the **Target SSB Android app** as possibly unpublished from Google Play since March 2024, based on a third-party app-tracker site. A second agent independently fetched the **live** Play Store listing directly on the same day and found it unambiguously live, actively maintained, with the developer replying to recent reviews. We treat the direct, dated fetch as authoritative and the third-party tracker claim as stale/incorrect — this is recorded in the catalogue's `verification_status` field for transparency, and is a good example of why every claim in this catalogue is independently checked rather than taken from a single source.

---

## 4. New platforms discovered this pass (not in v1 at all)

Provers, SSB Core AI, PsychSirAI, AI SSB, SSBGPT, SSBPrep.online, ClearSSB, TATTests.me, Troppers, SSB OPAM Simulator, SSB Squad (YouTube), the abandoned "SSB psych" app, SSB Preparation (Aditya Thakur), SSB Smart Learning (SSBWINGS), SSBTEST, SSB - Self Selection Board (app), NCA's free SRT trial, SSB Buddy (both the website and the unrelated Android app), Calm Chase, WishWas, SSB Psych Prep, AFPA's YouTube channel, SSBCrackExams' learning platform/app, SSBCrackExams' YouTube channel, and all 11 example/demonstration videos in §2.B.

---

## 5. AI feedback — honest assessment

This was the single most important thing to get right, since "AI-powered" is cheap to claim and hard to verify. We directly fetched every platform claiming AI evaluation (SSB Core AI, PsychSirAI, AI SSB, Provers, SSBGPT, SSBPrep.online, Calm Chase, TATTests.me, SSB OPAM Simulator):

- **None disclosed methodology** — what model, what it actually parses (sentiment? structure? keyword matching for "officer-like qualities"? genuine NLP/LLM reasoning?).
- **Most fetched pages returned little beyond marketing headers** — several of these sites are heavily JS-rendered SPAs that our fetch tools could not execute past the page title.
- **No independent user reviews** were found on Reddit, Quora, or Play Store for any of them confirming the feedback actually works as described.
- **Provers is the partial exception** — its landing page shows one illustrative sample TAT evaluation with strengths/improvement areas listed. This is more than a bare claim, but it is still one example on a marketing page, not proof of live, per-submission analysis.
- Our overall confidence that any of these platforms deliver genuine, response-specific AI analysis (versus templated/generic officer-quality language) is **LOW across the board**, with Provers rated LOW-MEDIUM as the ceiling.

**Product-fit flag for EliteCadet:** TATTests.me frames its AI output as a "personality insights report" using trait-style psychological language. This directly overlaps with EliteCadet's own AGENTS.md §11 rule — AI feedback must never present psychological trait claims as fact. If EliteCadet builds its own AI feedback feature, this framing should specifically be avoided, and linking to TATTests.me should be done cautiously if at all.

By contrast, **named human feedback is comparatively better-evidenced** (specific individuals, specific claimed postings) even though none of those claims were independently corroborated against official service records either — the difference is that a named retired officer with a specific claimed SSB board and years is a falsifiable, checkable claim in a way "our AI model" is not.

---

## 6. Notable disambiguations and flags

- **"SSB Buddy" is two unrelated products sharing a name.** The website (ssbbuddy.com, "made for aspirants, by an aspirant," anonymous) has only a WAT timer and a 10-situation SRT tool with model answers — no TAT, no SD. The Android app (developer "TheNeerajSec," com.theneerajsec.ssbbuddy) is a separate, much larger product (200+ TAT / 450+ WAT / 120+ SRT, gamified XP system) with a small user base (1K+ downloads vs. Target SSB's 100K+). Do not conflate these when linking.
- **SSB OPAM Simulator** practices a related but genuinely different instrument (OPAM/CSSS, a computer-based screening format), not the classic TAT/WAT/SRT/SD battery — its relevance is limited to one SRT-like 60-scenario mode. Label clearly if linked.
- **WishWas** describes "real photographic TAT picture cards" — this phrasing raised a possible copyright concern (does this mean actual official/copyrighted TAT imagery, or original photography?) that could not be resolved without viewing the images directly. Flagged `needs_verification`; do not feature prominently until checked. WishWas also makes an unverifiable "100+ years combined SSB experience" credibility claim naming no individuals.
- **The abandoned "SSB psych" app** (developer Manoj Basnal, last updated 2013, now only on unofficial APK mirrors) is explicitly excluded — do not link, installing from third-party APK mirrors is a real security risk for students.
- **Troppers'** claimed SDT module could not be confirmed (its subpage fetch returned no content) even though TAT/WAT/SRT counts were solidly verified — do not assume it covers all four tests.

---

## 7. Final analysis

**1. Strongest learning resources?** SSBCrack's beginner explainers (R001, R004, R009) for baseline mechanics; No Frills Academy's Col MM Nehru (R003) for genuine assessor-side TAT guidance; the new video finds — Maj Gen VPS Bhakuni (R017/R018) and Gp Capt AK Srivastava (R021) — are qualitatively the strongest learning resources found in either pass, since they combine named, cross-verified expertise with worked reasoning rather than generic tips.

**2. Strongest practical resources per test?**
- TAT: ssbpsychtest.in (R054, 50+ sets) for volume; Troppers (R068, 20 sets w/ model answers) for guided practice; Target SSB app (R029) for mobile.
- WAT: ssbpsychtest.in (R055, 25 sets/1,500 words) for volume; DOSPDP (R032) for credentialed-operator trust.
- SRT: ssbpsychtest.in (R056, 25 sets) for volume; DOSPDP (R038, newly confirmed) for credentialed trust.
- SD: SSB Practice (R049) and WishWas (R053) — the only two genuinely dedicated SD tools found.

**3. Largest practice banks?** ssbpsychtest.in (50+/25/25/1 across TAT/WAT/SRT/SD) and the SSB Buddy Android app (200+/450+/120+, though smaller user base and unverified quality) are the largest by verified/claimed count.

**4. Most test series?** ssbpsychtest.in and Troppers, both with real, independently-page-verified per-test counts rather than vague "hundreds" claims.

**5. Most realistic timing?** DOSPDP, SSB Practice, ssbpsychtest.in, and Target SSB app all have automatic, non-pausable timing matching stated real SSB timings (30s/4min TAT, 15s WAT, 30s/60-situation SRT). SSB Practice additionally distinguishes Strict vs. Practice mode explicitly.

**6. Full Day 2 simulation?** ssbpsychtest.in's Full Mock (R080) is the only confirmed, genuinely continuous, correctly-timed, all-four-test sequence found — with the important caveat that it delivers zero feedback of any kind.

**7. AI feedback?** Ten platforms claim it; confidence is LOW to VERY LOW across the board; Provers is the least-unverified (LOW-MEDIUM). See §5.

**8. Expert/human feedback?** AFPA (4 named evaluators), SSB Psych Prep (1 named evaluator), ClearSSB (unnamed retired psychologists, stated 2+ terms board experience), NCA's paid tier. All paid, all offline/scheduled, none on-demand.

**9. Completely free?** 49 of 80 catalogued resources, including the two strongest practice platforms by volume (ssbpsychtest.in, SSB Practice), DOSPDP, SSB Arena, WishWas, Target SSB app, and the Indian Army official PDF.

**10. Require payment?** 5 fully paid (AFPA's 3 products, SSB Psych Prep, ClearSSB) — all human-feedback services, not practice tools. 18 more are freemium (core practice free, extras paid).

**11. Require login?** WishWas and the SSB Buddy website require an account; most pure practice tools (DOSPDP, SSB Arena, SSB Practice, ssbpsychtest.in, Target SSB app) do not.

**12. Web-based?** The large majority — most simulators are browser tools.

**13. Mobile apps?** Target SSB (verified, largest user base), SSB Buddy app, Aditya Thakur's app, SSBWINGS' Smart Learning app, AI SSB, SSBCrackExams' learning app, SSBTEST.

**14/15. Useful enough to link vs. should not be linked?** See the catalogue's `inclusion_status` field per entry (45 `recommended`, 15 `usable_secondary`, 20 `needs_verification`) and `excluded_and_flagged_entries` (5 entries: the abandoned app, the unverifiable targetssb.in website, a thin content-only app, a weakly-verified YouTube-only channel, and DOSPDP's confirmed SD absence as a documented negative finding). We are deliberately not producing a single ranked list, per your instruction — the `inclusion_status` and per-capability groupings in §2 are the intended decision inputs.

**16. What capability is missing from existing platforms?**
- **A genuinely trustworthy, verifiable AI feedback mechanism** — every AI-feedback claim found is weakly or entirely unverified.
- **Dedicated SD/SDT practice** — the thinnest category everywhere except SSB Practice and WishWas.
- **A real guided self-reflection exercise for SD** — every platform treats SD as "write 5 paragraphs," none walk a student through genuinely reflecting (e.g., structured prompts to actually gather and reconcile feedback from parents/teachers/friends) beyond generic "ask people close to you" advice.
- **Free, on-demand human feedback** — all named-expert feedback found is paid and scheduled.
- **A single platform combining large practice banks (ssbpsychtest.in/Troppers-level volume) with credible feedback (AFPA/ClearSSB-level expertise) with modern UX** — no platform found does all three at once.

**17. What should EliteCadet build itself vs. link externally?** *(Evidence only, no strategy decision implied — your call.)* The clearest, most consistently-confirmed gap across every platform researched is SD/SDT: thin practice content, no dedicated reflection tooling, and the weakest demonstration content of the four tests. The second-clearest gap is trustworthy feedback — nothing found combines verifiable methodology with volume. Both are documented here as evidence for your own product decision, not a recommendation.

---

## 8. What was NOT done (by design)

- No application code, components, routes, or data files were modified.
- No copyrighted content (TAT pictures, WAT words, SRT situations, SD samples, book text, video transcripts) was copied, scraped, or reproduced.
- No resource was invented or assumed to exist without being fetched/searched and checked.
- No single "best resources" ranking was produced — resources are organized by capability per your instruction.
- No commit or push was made.
