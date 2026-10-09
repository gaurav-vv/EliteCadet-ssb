// The 5-Day SSB Practice Journey's structure (T039, T083b): days, modules,
// reading/info copy and self-review checklists. This is product copy kept in
// code; the question banks themselves live in Postgres (practice_items,
// supabase/migrations/0014_practice.sql) and modules point at them by slug.

import type {
  SsbDayId,
  SsbDaySummary,
  SsbModuleDetail,
  SsbModuleSummary,
} from "@/types/ssb-journey";

export const SSB_DAYS: SsbDaySummary[] = [
  {
    id: "day-1",
    dayNumber: 1,
    title: "Reporting & Screening",
    description: "Reporting, document check, chest numbers, OIR & PPDT tests.",
    longDescription:
      "Day 1 decides who continues: after reporting, document verification and chest number allotment, every candidate sits the OIR test and the PPDT the same day. Roughly two-thirds of candidates are screened out here — the rest move on to the next four days. Speed and accuracy under time pressure matter more than anything else today.",
  },
  {
    id: "day-2",
    dayNumber: 2,
    title: "Psychology",
    description: "Psychology tests: TAT, WAT, SRT, and Self-Description.",
    longDescription:
      "The full psychology battery runs in one sitting: TAT, WAT, SRT and the Self-Description Test. There's no right answer to chase — assessors are looking for a consistent, positive, action-oriented personality across all four tests, so contradictions between them stand out more than any single weak response.",
  },
  {
    id: "day-3",
    dayNumber: 3,
    title: "GTO Tasks I",
    description: "GTO tasks: Group Discussion, Group Planning, PGT, Race, HGT, Lecturette.",
    longDescription:
      "The Group Testing Officer's tasks begin: Group Discussion, Group Planning, the Progressive Group Task, a group Race, the Half Group Task and the Lecturette. These are largely outdoor, physical and verbal tasks — the GTO is watching how you actually behave in a group, not what you say about yourself.",
  },
  {
    id: "day-4",
    dayNumber: 4,
    title: "GTO Tasks II & Interview",
    description: "More GTO tasks: Individual obstacles, Command task, FGT, Interview.",
    longDescription:
      "GTO tasks continue with the Individual Obstacles, the Command Task (where you lead a small team of your own choosing) and the Final Group Task. Your Personal Interview with the Interviewing Officer is also scheduled around this day for many candidates — a detailed, one-on-one conversation based on your PIQ form.",
  },
  {
    id: "day-5",
    dayNumber: 5,
    title: "Conference",
    description: "Conference, closing address, and final results.",
    longDescription:
      "The final day: all three assessors (IO, GTO, Psychologist) sit together in conference to review your performance across the whole five days, you may be asked a few final questions, and the board announces its recommendation. There's little left to prove today — consistency with how you've shown up all week matters most.",
  },
];

export const INTERVIEW_SELF_REVIEW = [
  "I answered the question that was actually asked",
  "I gave a specific, real example",
  "It matches what I wrote in my PIQ",
  "I was honest, including about weaker points",
  "It would take about 1–2 minutes to say aloud",
];

export const CONFERENCE_SELF_REVIEW = [
  "I answered briefly and directly",
  "It matches how I actually performed this week",
  "I stayed composed and didn't oversell myself",
];

export const SELF_ASSESSMENT_TRAITS = [
  "Effective Intelligence",
  "Reasoning Ability",
  "Initiative",
  "Social Adaptability",
  "Cooperation",
  "Sense of Responsibility",
  "Self Confidence",
  "Speed of Decision",
  "Ability to Influence the Group",
  "Stamina",
];

function reading(body: string, articles?: { title: string; body: string }[]) {
  return { body, articles };
}

function info(overview: string, tips: string[], durationLabel?: string) {
  return { overview, tips, durationLabel };
}

const MODULE_DETAIL: Record<SsbDayId, SsbModuleDetail[]> = {
  "day-1": [
    {
      id: "screening",
      dayId: "day-1",
      title: "Screening",
      description: "Introduction to Screening & Officer Like Qualities.",
      icon: "checklist",
      kind: "reading",
      reading: reading(
        "Screening is Day 1's first hurdle: after reporting and document verification, every candidate sits the OIR test and the PPDT. Only candidates who clear screening continue to the remaining four days.",
        [
          {
            title: "What assessors look for at screening",
            body: "Screening combines your OIR score with your PPDT performance (picture perception + the group discussion that follows it). Assessors are looking for the early signs of Officer Like Qualities (OLQs) — reasoning ability, initiative, and the ability to express a clear, positive perception under time pressure.",
          },
          {
            title: "Reporting day essentials",
            body: "Carry all original documents plus photocopies, arrive in the prescribed dress code, and expect a chest number allotment before any testing begins. Being organised here sets the tone for the rest of the day.",
          },
        ],
      ),
    },
    {
      id: "oir-practice",
      dayId: "day-1",
      title: "OIR Practice",
      description: "Verbal reasoning, at your own pace.",
      icon: "oir",
      kind: "bank",
      bank: { itemKind: "mcq", mode: "practice", slug: "oir-verbal-practice" },
      context: "OIR measures verbal reasoning speed and accuracy under time pressure. Most candidates improve mainly through repeated practice with this exact question style, not raw intelligence — work through every item here at least once before attempting the timed test.",
    },
    { id: "oir-test", dayId: "day-1", title: "OIR Test", description: "Timed verbal reasoning test.", icon: "oir", kind: "bank", bank: { itemKind: "mcq", mode: "test", slug: "oir-verbal-test" } },
    {
      id: "oir-nonverbal-practice",
      dayId: "day-1",
      title: "OIR Non-verbal Practice",
      description: "Pattern & figure reasoning, at your own pace.",
      icon: "oir",
      kind: "bank",
      bank: { itemKind: "mcq", mode: "practice", slug: "oir-nonverbal-practice" },
      context: "Non-verbal reasoning tests pattern recognition without relying on language. Before checking the options, try to state the rule governing the sequence out loud — that habit is what actually speeds you up on test day.",
    },
    { id: "oir-nonverbal-test", dayId: "day-1", title: "OIR Non-verbal Test", description: "Timed pattern & figure reasoning test.", icon: "oir", kind: "bank", bank: { itemKind: "mcq", mode: "test", slug: "oir-nonverbal-test" } },
    {
      id: "ppdt",
      dayId: "day-1",
      title: "PPDT",
      description: "Picture Perception & Discussion Test.",
      icon: "ppdt",
      kind: "bank",
      bank: { itemKind: "response", mode: "test", slug: "ppdt" },
      carouselTiming: { mode: "carousel", stimulusSeconds: 30, responseSeconds: 240 },
      context: "What you write matters less than staying positive, realistic and action-oriented — and how clearly you defend your story in the group discussion that follows matters just as much as the story itself.",
    },
  ],
  "day-2": [
    { id: "wat-practice", dayId: "day-2", title: "WAT Practice", description: "Word Association Test, at your own pace.", icon: "psychology", kind: "bank", bank: { itemKind: "response", mode: "practice", slug: "wat" }, context: "WAT rewards speed and consistency, not cleverness. Write the first natural, positive association that comes to mind — overthinking a word is what actually costs candidates the most time on test day." },
    { id: "wat-test", dayId: "day-2", title: "WAT Test", description: "Timed Word Association Test.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/wat", bank: { itemKind: "response", mode: "test", slug: "wat" } },
    { id: "tat-practice", dayId: "day-2", title: "TAT Practice", description: "Thematic Apperception Test, at your own pace.", icon: "psychology", kind: "bank", bank: { itemKind: "response", mode: "practice", slug: "tat" }, context: "Give your character a clear goal and resolve the story with a realistic, positive outcome. Assessors read your stories side by side, so a consistent personality across all of them matters more than any single dramatic story." },
    { id: "tat-test", dayId: "day-2", title: "TAT Test", description: "Timed Thematic Apperception Test.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/tat", bank: { itemKind: "response", mode: "test", slug: "tat" } },
    { id: "srt-practice", dayId: "day-2", title: "SRT Practice", description: "Situation Reaction Test, at your own pace.", icon: "psychology", kind: "bank", bank: { itemKind: "response", mode: "practice", slug: "srt" }, context: "State what you would DO, not what you feel about the situation. One or two practical sentences that show initiative and consideration for others score higher than a long explanation." },
    { id: "srt-test", dayId: "day-2", title: "SRT Test", description: "Timed Situation Reaction Test.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/srt", bank: { itemKind: "response", mode: "test", slug: "srt" } },
    { id: "self-description", dayId: "day-2", title: "Self Description", description: "Describe yourself from five points of view.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/sdt", bank: { itemKind: "response", mode: "test", slug: "sdt" } },
  ],
  "day-3": [
    {
      id: "gto-blogs",
      dayId: "day-3",
      title: "GTO Blogs",
      description: "Guides on every outdoor GTO task.",
      icon: "gto",
      kind: "reading",
      reading: reading("Short guides covering how each GTO task is actually assessed.", [
        { title: "What the GTO is really scoring", body: "The GTO doesn't score who talks the most or who's physically fastest — they're watching for practical planning, cooperation, and whether you adjust when a plan isn't working." },
        { title: "Group Discussion, in practice", body: "Speak early but don't dominate. Build on what others say instead of only pushing your own point, and bring the discussion back on-topic if it drifts." },
        { title: "Progressive Group Task basics", body: "PGT rewards realistic use of the materials given (planks, ropes) over clever-sounding but impractical ideas. Suggest something you can actually help execute." },
      ]),
    },
    {
      id: "gto-lectures",
      dayId: "day-3",
      title: "GTO Lectures",
      description: "Lecturette topics and structure.",
      icon: "lecture",
      kind: "reading",
      reading: reading("The Lecturette is a 3-minute solo talk on a topic you pick from a set of chits.", [
        { title: "Structuring a 3-minute Lecturette", body: "Use a simple structure: a one-line introduction, 2-3 clear points, and a short conclusion. Running out of things to say is more common — and more damaging — than running out of time." },
        { title: "Picking a topic under pressure", body: "Pick the topic you can speak on for the full 3 minutes with concrete examples, not the one that sounds most impressive on paper." },
      ]),
    },
    { id: "gd", dayId: "day-3", title: "GD", description: "Group Discussion — no appointed leader, everyone is assessed equally.", icon: "gto", kind: "info", info: info("A group of 8-10 candidates discusses a given topic for about 10-15 minutes, with no appointed leader.", ["Speak within the first minute so you're not seen as passive.", "Listen actively and build on others' points instead of repeating your own.", "Stay on-topic and help steer the group back if it drifts.", "Avoid interrupting or getting into a shouting match."], "~10-15 min · Group of 8-10, no leader") },
    { id: "group-planning", dayId: "day-3", title: "Group Planning", description: "Military Planning Exercise — plan a response to a model situation as a group.", icon: "gto", kind: "info", info: info("The group is given a model and a situation (e.g. a natural disaster) and must jointly plan a course of action, then present it.", ["Read the entire situation and the model carefully before proposing anything.", "Note all the resources and constraints given — a good plan uses only what's actually available.", "Volunteer to present or contribute clearly during the group presentation.", "Prioritise practicality over an impressive-sounding but unworkable plan."], "~20-30 min · Whole group") },
    { id: "pgt", dayId: "day-3", title: "PGT", description: "Progressive Group Task — cross a series of obstacles together, difficulty increasing each time.", icon: "gto", kind: "info", info: info("The group crosses a series of obstacles together using limited materials (planks, ropes, drums), with difficulty increasing at each obstacle.", ["Contribute physically, not just verbally — the GTO is watching participation.", "Suggest ideas you can help carry out, not just clever theory.", "Help teammates who are struggling with a particular obstacle.", "Stay within the stated rules for that obstacle (out-of-bounds areas, material limits)."], "~45-60 min · Outdoor, whole group") },
    { id: "hgt", dayId: "day-3", title: "HGT", description: "Half Group Task — a smaller-group obstacle with more individual visibility.", icon: "gto", kind: "info", info: info("A smaller group (split from the main group) tackles one obstacle, similar in format to the PGT but with fewer people and more individual visibility.", ["With fewer people, your individual contribution is much more visible — stay engaged throughout.", "Communicate clearly about what you're doing and why.", "Be ready to both lead and follow depending on the situation."], "~15-20 min · Half group") },
    { id: "race", dayId: "day-3", title: "Race", description: "A timed group obstacle race testing fitness and coordination together.", icon: "gto", kind: "info", info: info("A timed, competitive obstacle course completed by the whole group together, testing physical fitness alongside team coordination.", ["Pace yourself — finishing while helping teammates matters more than finishing first alone.", "Encourage others rather than leaving slower teammates behind.", "Follow safety instructions for each obstacle exactly as briefed."], "~10-15 min · Whole group, timed") },
    { id: "lecturette", dayId: "day-3", title: "Lecturette", description: "A 3-minute solo talk on a topic you pick from a set of chits.", icon: "lecture", kind: "info", info: info("Each candidate picks one topic from a set of chits and speaks alone for about 3 minutes in front of the group.", ["Pick a topic you have real content for, not the most impressive-sounding one.", "Open with a clear one-line introduction and close with a short conclusion.", "Use concrete examples rather than only abstract statements.", "Practice pacing so you neither run out of time nor run dry early."], "~3 min · Solo") },
  ],
  "day-4": [
    { id: "individual-obstacles", dayId: "day-4", title: "Individual Obstacles", description: "Solo obstacle task — up to 10 obstacles, points per one completed.", icon: "obstacle", kind: "info", info: info("Each candidate attempts up to 10 physical obstacles solo within a time limit, earning points per obstacle completed.", ["Attempt obstacles you're confident about first to bank points early.", "Follow the demonstrated technique for each obstacle rather than improvising unsafely.", "Keep moving — points come from obstacles attempted within the time limit, not from any single one."], "~10 min · Solo, 10 obstacles") },
    { id: "command-task", dayId: "day-4", title: "Command Task", description: "You lead a small team you choose yourself to complete a given task.", icon: "command", kind: "info", info: info("You're given a task and told to pick 2-3 subordinates from the group to help you complete it, then briefed by the GTO afterward.", ["Choose subordinates for the task, not just your friends in the group.", "Give clear instructions rather than doing everything yourself.", "Be ready to explain your plan and reasoning to the GTO afterward."], "~15-20 min · You + 2-3 chosen subordinates") },
    { id: "fgt", dayId: "day-4", title: "FGT", description: "Final Group Task — one last group obstacle before individual tasks and the interview.", icon: "gto", kind: "info", info: info("A last group obstacle task, similar to the PGT, giving the GTO a final, focused look at your teamwork before individual tasks and the interview.", ["Treat it with the same seriousness as the PGT — it's still being assessed.", "Apply anything you learned about the group's dynamic from earlier tasks.", "Stay cooperative even if the group is tired by this point in the day."], "~30-45 min · Whole group") },
    { id: "personal-interview", dayId: "day-4", title: "Personal Interview", description: "One-on-one interview with the IO, based on your PIQ form.", icon: "interview", kind: "bank", href: "/student/practice/interview", bank: { itemKind: "response", mode: "practice", slug: "interview" }, selfReview: INTERVIEW_SELF_REVIEW, context: "The interview cross-checks everything against your PIQ form and your other tests. Answer honestly and consistently — a rehearsed 'ideal' answer that contradicts what you wrote elsewhere is worse than an honest, ordinary one." },
  ],
  "day-5": [
    {
      id: "conference-preparation",
      dayId: "day-5",
      title: "Conference Preparation",
      description: "What to expect in the final conference.",
      icon: "conference",
      kind: "reading",
      reading: reading(
        "The conference is the final day: every assessor (IO, GTO, Psychologist) sits together, reviews your performance across all five days, and may ask you a few final questions before the board's recommendation.",
        [
          { title: "What actually happens", body: "You'll typically enter one at a time, may be asked one or two brief questions, and the board discusses candidates after everyone has been seen. It's a formality for most candidates, not a fresh test." },
          { title: "How to carry yourself", body: "Stay composed and honest — the conference isn't the place to oversell yourself beyond what you've already shown across the previous four days." },
        ],
      ),
    },
    { id: "conference-questions", dayId: "day-5", title: "Conference Questions", description: "Practice common conference questions.", icon: "conference", kind: "bank", bank: { itemKind: "response", mode: "practice", slug: "conference" }, selfReview: CONFERENCE_SELF_REVIEW, context: "The conference rarely changes an assessor's mind at this point — it's a final, honest check, not a chance to oversell yourself. Practising these helps you answer calmly, not to script a performance." },
    { id: "mock-conference", dayId: "day-5", title: "Mock Conference", description: "A walkthrough of the real conference, then a short timed run.", icon: "conference", kind: "info", href: "/student/practice/conference/mock", info: info("A short, informal run-through of how the real conference typically proceeds, to reduce surprises on the day.", ["Expect to wait — conferences often run candidate-by-candidate through the whole batch.", "Answer only what's asked; keep responses brief and direct.", "There's nothing to 'perform' here beyond being consistent with how you've behaved all week."], "~5 min read · Whole batch, one at a time") },
    { id: "final-self-assessment", dayId: "day-5", title: "Final Self Assessment", description: "Rate yourself 1-5 across the ten standard OLQs.", icon: "checklist", kind: "checklist", context: "An honest rating here — including in areas you're weaker at — is more useful for your preparation than a flattering one. No one else sees this; it's stored on this device only." },
    { id: "ssb-journey-final-progress", dayId: "day-5", title: "SSB Journey / Final Progress", description: "Your full 5-day journey, at a glance.", icon: "finalProgress", kind: "summary", context: "A snapshot of how much of each day's practice bank you've actually worked through — use it to spot which day needs another pass before you feel ready." },
  ],
};

export function getModulesForDay(dayId: SsbDayId): SsbModuleSummary[] {
  return MODULE_DETAIL[dayId].map((detail) => {
    const summary: SsbModuleSummary = {
      id: detail.id,
      dayId: detail.dayId,
      title: detail.title,
      description: detail.description,
      icon: detail.icon,
      kind: detail.kind,
      href: detail.href,
      bank: detail.bank,
      durationLabel: detail.info?.durationLabel,
    };
    return summary;
  });
}

export function getModuleDetail(dayId: SsbDayId, moduleId: string): SsbModuleDetail | undefined {
  return MODULE_DETAIL[dayId].find((m) => m.id === moduleId);
}

export function getAllModules(): SsbModuleDetail[] {
  return Object.values(MODULE_DETAIL).flat();
}

export function getDay(dayId: string): SsbDaySummary | undefined {
  return SSB_DAYS.find((d) => d.id === dayId);
}

export function isDayId(value: string): value is SsbDayId {
  return SSB_DAYS.some((d) => d.id === value);
}

/** Self-paced (practice-mode) bank modules in journey order — what progress and "continue" are measured on. */
export function getPracticeBankModules(): (SsbModuleDetail & { bank: NonNullable<SsbModuleDetail["bank"]> })[] {
  return getAllModules().filter((m): m is SsbModuleDetail & { bank: NonNullable<SsbModuleDetail["bank"]> } => m.kind === "bank" && m.bank?.mode === "practice");
}
