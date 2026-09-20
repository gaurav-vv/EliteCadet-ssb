// MOCK CONTENT — isolated per AGENTS.md §8, same rationale as lib/mock/practice.ts
// and lib/mock/resources.ts. This is placeholder SSB-style content, not real
// user/activity data. Counts shown to the student (e.g. "12 of 15 done")
// always come from the actual length of these arrays — never inflated to
// match a marketing figure — per AGENTS.md §8's "no fabricated metrics" rule.
// Non-verbal OIR items are described in text rather than shown as images,
// same placeholder rationale as TAT's text scene descriptions (blocker B5,
// no image asset pipeline yet).

import { getPracticeItems } from "@/lib/mock/practice";
import type { PracticeItem } from "@/types/practice";
import type {
  McqItem,
  SsbDayId,
  SsbDaySummary,
  SsbModuleDetail,
  SsbModuleSummary,
} from "@/types/ssb-journey";

export const SSB_DAYS: SsbDaySummary[] = [
  { id: "day-1", dayNumber: 1, title: "Reporting & Screening", description: "Reporting, document check, chest numbers, OIR & PPDT tests." },
  { id: "day-2", dayNumber: 2, title: "Psychology", description: "Psychology tests: TAT, WAT, SRT, and Self-Description." },
  { id: "day-3", dayNumber: 3, title: "GTO Tasks I", description: "GTO tasks: Group Discussion, Group Planning, PGT, Race, HGT, Lecturette." },
  { id: "day-4", dayNumber: 4, title: "GTO Tasks II & Interview", description: "More GTO tasks: Individual obstacles, Command task, FGT, Interview." },
  { id: "day-5", dayNumber: 5, title: "Conference", description: "Conference, closing address, and final results." },
];

function toMcq(
  prefix: string,
  items: { prompt: string; options: string[]; correctIndex: number }[],
): McqItem[] {
  const letters = ["a", "b", "c", "d"];
  return items.map((item, index) => ({
    id: `${prefix}-${index + 1}`,
    prompt: item.prompt,
    options: item.options.map((label, i) => ({ id: `${prefix}-${index + 1}-${letters[i]}`, label })),
    correctOptionId: `${prefix}-${index + 1}-${letters[item.correctIndex]}`,
  }));
}

const OIR_VERBAL_PRACTICE = toMcq("oir-p", [
  { prompt: "Soldier is to Army as Sailor is to ____", options: ["Navy", "Air Force", "Police", "Marines"], correctIndex: 0 },
  { prompt: "Complete the series: 2, 4, 8, 16, ?", options: ["24", "30", "32", "36"], correctIndex: 2 },
  { prompt: "Which does not belong: Rifle, Sword, Tank, Helmet", options: ["Rifle", "Sword", "Tank", "Helmet"], correctIndex: 3 },
  { prompt: "If CAT is coded as DBU (each letter +1), how is DOG coded?", options: ["EPH", "EPI", "DPG", "EOH"], correctIndex: 0 },
  { prompt: "A man says, \"She is the daughter of my grandfather's only son.\" How is the girl related to the man, if he is that son?", options: ["Mother", "Sister", "Cousin", "Aunt"], correctIndex: 1 },
  { prompt: "Complete the series: 3, 6, 11, 18, 27, ?", options: ["34", "36", "38", "40"], correctIndex: 2 },
  { prompt: "Pen is to Write as Knife is to ____", options: ["Sharp", "Cut", "Kitchen", "Metal"], correctIndex: 1 },
  { prompt: "Which is different: Delhi, Mumbai, Punjab, Chennai", options: ["Delhi", "Mumbai", "Punjab", "Chennai"], correctIndex: 2 },
  { prompt: "Complete the series: A, C, E, G, ?", options: ["H", "I", "J", "F"], correctIndex: 1 },
  { prompt: "All soldiers are disciplined. Ram is a soldier. Therefore:", options: ["Ram is disciplined", "Ram is an officer", "All disciplined people are soldiers", "Cannot be determined"], correctIndex: 0 },
  { prompt: "If ROSE is coded as 6-15-19-5 (A=1..Z=26), how is BUD coded?", options: ["2-21-4", "2-20-4", "1-21-4", "2-21-5"], correctIndex: 0 },
  { prompt: "Doctor is to Hospital as Teacher is to ____", options: ["Classroom", "School", "Book", "Student"], correctIndex: 1 },
  { prompt: "Complete the letter series: Z, X, V, T, ?", options: ["S", "Q", "R", "U"], correctIndex: 2 },
  { prompt: "Which does not belong: Triangle, Square, Circle, Cube", options: ["Triangle", "Square", "Circle", "Cube"], correctIndex: 3 },
  { prompt: "Complete the series: 5, 10, 20, 40, ?", options: ["60", "70", "80", "90"], correctIndex: 2 },
]);

const OIR_VERBAL_TEST = toMcq("oir-t", [
  { prompt: "Bird is to Nest as Bee is to ____", options: ["Hive", "Flower", "Garden", "Honey"], correctIndex: 0 },
  { prompt: "Which is different: Apple, Mango, Potato, Banana", options: ["Apple", "Mango", "Potato", "Banana"], correctIndex: 2 },
  { prompt: "If BOOK is coded as CPPL (each letter +1), how is PAGE coded?", options: ["QBHF", "QBGF", "QAHF", "PBHF"], correctIndex: 0 },
  { prompt: "A is B's brother. B is C's sister. C is D's father. How is A related to D?", options: ["Father", "Uncle", "Brother", "Grandfather"], correctIndex: 1 },
  { prompt: "Complete the series: 7, 14, 28, 56, ?", options: ["84", "100", "112", "120"], correctIndex: 2 },
  { prompt: "Fish is to Water as Bird is to ____", options: ["Nest", "Sky", "Wing", "Tree"], correctIndex: 1 },
  { prompt: "Which does not belong: Rose, Lotus, Jasmine, Mango", options: ["Rose", "Lotus", "Jasmine", "Mango"], correctIndex: 3 },
  { prompt: "Complete the letter series: B, D, F, H, ?", options: ["I", "J", "K", "G"], correctIndex: 1 },
  { prompt: "All officers are punctual. Some punctual people are strict. Therefore:", options: ["All officers are strict", "Some officers are strict", "Cannot be determined", "No officers are strict"], correctIndex: 2 },
  { prompt: "If WATER is coded as XBUFS (each letter +1), how is EARTH coded?", options: ["FBSUI", "FBSUH", "FBSTI", "EBSUI"], correctIndex: 0 },
  { prompt: "Author is to Book as Sculptor is to ____", options: ["Chisel", "Statue", "Museum", "Stone"], correctIndex: 1 },
  { prompt: "Complete the series: 100, 90, 81, 73, ?", options: ["64", "65", "66", "68"], correctIndex: 2 },
  { prompt: "Which is different: Delhi, Kolkata, Mumbai, India", options: ["Delhi", "Kolkata", "Mumbai", "India"], correctIndex: 3 },
  { prompt: "A man faces North, turns 90° clockwise, then 180°. Which direction does he now face?", options: ["North", "South", "East", "West"], correctIndex: 1 },
  { prompt: "Complete the series: 1, 4, 9, 16, ?", options: ["20", "24", "25", "36"], correctIndex: 2 },
]);

const OIR_NONVERBAL_PRACTICE = toMcq("oirnv-p", [
  { prompt: "A circle appears with 0 dots, then 1 dot, then 2 dots, then 3 dots inside it. What comes next?", options: ["A circle with 4 dots", "A circle with 0 dots", "A square with 4 dots", "A circle with 3 dots"], correctIndex: 0 },
  { prompt: "A triangle rotates 90° clockwise each step: pointing up, pointing right, pointing down. What is the next position?", options: ["Pointing up", "Pointing left", "Pointing down", "Pointing right"], correctIndex: 1 },
  { prompt: "A shape gains one side each step: triangle (3), square (4), pentagon (5). What comes next?", options: ["Hexagon (6)", "Heptagon (7)", "Square (4)", "Circle"], correctIndex: 0 },
  { prompt: "A pattern alternates: black square, white square, black square, white square. What comes next?", options: ["White square", "Black square", "Grey square", "Black circle"], correctIndex: 1 },
  { prompt: "An arrow rotates 45° counter-clockwise each step: right, up-right, up. What is next?", options: ["Up-left", "Down", "Right", "Up-right"], correctIndex: 0 },
  { prompt: "Shading moves around a square: top-left, top-right, bottom-right. Where next?", options: ["Top-left", "Bottom-left", "Centre", "Top-right"], correctIndex: 1 },
  { prompt: "A row of stars doubles each step: 1, 2, 4, 8. How many stars come next?", options: ["10", "12", "16", "20"], correctIndex: 2 },
  { prompt: "Circles alternate filled/empty and grow: small filled, small empty, medium filled, medium empty. What comes next?", options: ["Large filled", "Large empty", "Medium filled", "Small filled"], correctIndex: 0 },
  { prompt: "A line grows by one unit each step: 1, 2, 3 units long. How long is the next line?", options: ["3 units", "4 units", "5 units", "6 units"], correctIndex: 1 },
  { prompt: "A shape loses one side each step: hexagon (6), pentagon (5), square (4). What comes next?", options: ["Triangle (3)", "Circle", "Pentagon (5)", "Line"], correctIndex: 0 },
]);

const OIR_NONVERBAL_TEST = toMcq("oirnv-t", [
  { prompt: "A pattern adds one parallel line each step: 1 line, 2 lines, 3 lines. What comes next?", options: ["3 lines", "4 lines", "5 lines", "2 lines"], correctIndex: 1 },
  { prompt: "A square rotates 90° clockwise each step, starting at 0°. What is its rotation after the 4th step?", options: ["90°", "180°", "270°", "360° (back to start)"], correctIndex: 3 },
  { prompt: "Dots arranged in a growing triangle: 1 dot, 3 dots, 6 dots. How many dots come next?", options: ["8", "9", "10", "12"], correctIndex: 2 },
  { prompt: "A pentagon gains one dot inside each step: 0 dots, 1 dot, 2 dots. How many dots come next?", options: ["2", "3", "4", "5"], correctIndex: 1 },
  { prompt: "An arrow rotates 90° clockwise each step: up, right, down. What is next?", options: ["Up", "Left", "Down", "Right"], correctIndex: 1 },
  { prompt: "A square doubles in size each step: 1cm, 2cm, 4cm. What is the next size?", options: ["6cm", "8cm", "10cm", "12cm"], correctIndex: 1 },
  { prompt: "A shape alternates every step: circle, square, circle, square. What comes next?", options: ["Circle", "Square", "Triangle", "Pentagon"], correctIndex: 0 },
  { prompt: "A circle's shaded portion grows each step: a quarter, a half, three-quarters. What comes next?", options: ["Fully shaded", "Still three-quarters", "Half shaded", "Unshaded"], correctIndex: 0 },
  { prompt: "A shape loses one side each step: octagon (8), heptagon (7), hexagon (6). What comes next?", options: ["Hexagon (6)", "Pentagon (5)", "Square (4)", "Heptagon (7)"], correctIndex: 1 },
  { prompt: "Triangles alternate up/down and increase in count: 1 up, 2 down, 3 up. What comes next?", options: ["3 down", "4 down", "4 up", "5 down"], correctIndex: 1 },
]);

const PPDT_ITEM: PracticeItem = {
  id: "ppdt-1",
  prompt:
    "A hazy, indistinct picture: a figure stands near a river at dusk, with two other shadowy figures nearby and what could be a boat or a fallen log in the water.",
};

const INTERVIEW_QUESTIONS: PracticeItem[] = [
  { id: "int-1", prompt: "Tell us about yourself in a few sentences." },
  { id: "int-2", prompt: "Why do you want to join the Armed Forces?" },
  { id: "int-3", prompt: "What are your strengths and weaknesses?" },
  { id: "int-4", prompt: "Describe a situation where you showed leadership." },
  { id: "int-5", prompt: "What do you know about the role you have applied for?" },
  { id: "int-6", prompt: "How do you handle failure or criticism?" },
  { id: "int-7", prompt: "Tell us about your hobbies and how they help you." },
  { id: "int-8", prompt: "What is your family's reaction to your decision to join the forces?" },
  { id: "int-9", prompt: "Describe a difficult decision you had to make and how you made it." },
  { id: "int-10", prompt: "What are your short-term and long-term goals?" },
  { id: "int-11", prompt: "How do you stay updated with current affairs?" },
  { id: "int-12", prompt: "Why should we select you over other candidates?" },
];

const CONFERENCE_QUESTIONS: PracticeItem[] = [
  { id: "conf-1", prompt: "Looking back at your GTO tasks, what would you do differently?" },
  { id: "conf-2", prompt: "What feedback did you receive during the psychology tests, and how do you view it?" },
  { id: "conf-3", prompt: "How would you describe your overall performance across the five days?" },
  { id: "conf-4", prompt: "What is one Officer-Like Quality you feel you demonstrated well?" },
  { id: "conf-5", prompt: "What is one area you plan to work on regardless of the result?" },
  { id: "conf-6", prompt: "How did you handle disagreements within your group during tasks?" },
  { id: "conf-7", prompt: "What did this SSB experience teach you about yourself?" },
  { id: "conf-8", prompt: "If selected, how will you prepare for the next stage?" },
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

function info(overview: string, tips: string[]) {
  return { overview, tips };
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
    { id: "oir-practice", dayId: "day-1", title: "OIR Practice", description: "Verbal reasoning, at your own pace.", icon: "oir", kind: "bank", bank: { itemKind: "mcq", mode: "practice" }, mcqItems: OIR_VERBAL_PRACTICE },
    { id: "oir-test", dayId: "day-1", title: "OIR Test", description: "Timed verbal reasoning test.", icon: "oir", kind: "bank", bank: { itemKind: "mcq", mode: "test" }, mcqItems: OIR_VERBAL_TEST },
    { id: "oir-nonverbal-practice", dayId: "day-1", title: "OIR Non-verbal Practice", description: "Pattern & figure reasoning, at your own pace.", icon: "oir", kind: "bank", bank: { itemKind: "mcq", mode: "practice" }, mcqItems: OIR_NONVERBAL_PRACTICE },
    { id: "oir-nonverbal-test", dayId: "day-1", title: "OIR Non-verbal Test", description: "Timed pattern & figure reasoning test.", icon: "oir", kind: "bank", bank: { itemKind: "mcq", mode: "test" }, mcqItems: OIR_NONVERBAL_TEST },
    {
      id: "ppdt",
      dayId: "day-1",
      title: "PPDT",
      description: "Picture Perception & Discussion Test.",
      icon: "ppdt",
      kind: "bank",
      bank: { itemKind: "response", mode: "test" },
      responseItems: [PPDT_ITEM],
      carouselTiming: { mode: "carousel", stimulusSeconds: 30, responseSeconds: 240 },
    },
  ],
  "day-2": [
    { id: "wat-practice", dayId: "day-2", title: "WAT Practice", description: "Word Association Test, at your own pace.", icon: "psychology", kind: "bank", bank: { itemKind: "response", mode: "practice" }, responseItems: getPracticeItems("wat") },
    { id: "wat-test", dayId: "day-2", title: "WAT Test", description: "Timed Word Association Test.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/wat", bank: { itemKind: "response", mode: "test" }, responseItems: getPracticeItems("wat") },
    { id: "tat-practice", dayId: "day-2", title: "TAT Practice", description: "Thematic Apperception Test, at your own pace.", icon: "psychology", kind: "bank", bank: { itemKind: "response", mode: "practice" }, responseItems: getPracticeItems("tat") },
    { id: "tat-test", dayId: "day-2", title: "TAT Test", description: "Timed Thematic Apperception Test.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/tat", bank: { itemKind: "response", mode: "test" }, responseItems: getPracticeItems("tat") },
    { id: "srt-practice", dayId: "day-2", title: "SRT Practice", description: "Situation Reaction Test, at your own pace.", icon: "psychology", kind: "bank", bank: { itemKind: "response", mode: "practice" }, responseItems: getPracticeItems("srt") },
    { id: "srt-test", dayId: "day-2", title: "SRT Test", description: "Timed Situation Reaction Test.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/srt", bank: { itemKind: "response", mode: "test" }, responseItems: getPracticeItems("srt") },
    { id: "self-description", dayId: "day-2", title: "Self Description", description: "Describe yourself from five points of view.", icon: "psychology", kind: "bank", href: "/student/practice/psychology/sdt", bank: { itemKind: "response", mode: "test" }, responseItems: getPracticeItems("sdt") },
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
    { id: "gd", dayId: "day-3", title: "GD", description: "Group Discussion.", icon: "gto", kind: "info", info: info("A group of 8-10 candidates discusses a given topic for about 10-15 minutes, with no appointed leader.", ["Speak within the first minute so you're not seen as passive.", "Listen actively and build on others' points instead of repeating your own.", "Stay on-topic and help steer the group back if it drifts.", "Avoid interrupting or getting into a shouting match."]) },
    { id: "group-planning", dayId: "day-3", title: "Group Planning", description: "Military Planning Exercise.", icon: "gto", kind: "info", info: info("The group is given a model and a situation (e.g. a natural disaster) and must jointly plan a course of action, then present it.", ["Read the entire situation and the model carefully before proposing anything.", "Note all the resources and constraints given — a good plan uses only what's actually available.", "Volunteer to present or contribute clearly during the group presentation.", "Prioritise practicality over an impressive-sounding but unworkable plan."]) },
    { id: "pgt", dayId: "day-3", title: "PGT", description: "Progressive Group Task.", icon: "gto", kind: "info", info: info("The group crosses a series of obstacles together using limited materials (planks, ropes, drums), with difficulty increasing at each obstacle.", ["Contribute physically, not just verbally — the GTO is watching participation.", "Suggest ideas you can help carry out, not just clever theory.", "Help teammates who are struggling with a particular obstacle.", "Stay within the stated rules for that obstacle (out-of-bounds areas, material limits)."]) },
    { id: "hgt", dayId: "day-3", title: "HGT", description: "Half Group Task.", icon: "gto", kind: "info", info: info("A smaller group (split from the main group) tackles one obstacle, similar in format to the PGT but with fewer people and more individual visibility.", ["With fewer people, your individual contribution is much more visible — stay engaged throughout.", "Communicate clearly about what you're doing and why.", "Be ready to both lead and follow depending on the situation."]) },
    { id: "race", dayId: "day-3", title: "Race", description: "Group obstacle race.", icon: "gto", kind: "info", info: info("A timed, competitive obstacle course completed by the whole group together, testing physical fitness alongside team coordination.", ["Pace yourself — finishing while helping teammates matters more than finishing first alone.", "Encourage others rather than leaving slower teammates behind.", "Follow safety instructions for each obstacle exactly as briefed."]) },
    { id: "lecturette", dayId: "day-3", title: "Lecturette", description: "3-minute individual talk.", icon: "lecture", kind: "info", info: info("Each candidate picks one topic from a set of chits and speaks alone for about 3 minutes in front of the group.", ["Pick a topic you have real content for, not the most impressive-sounding one.", "Open with a clear one-line introduction and close with a short conclusion.", "Use concrete examples rather than only abstract statements.", "Practice pacing so you neither run out of time nor run dry early."]) },
  ],
  "day-4": [
    { id: "individual-obstacles", dayId: "day-4", title: "Individual Obstacles", description: "Individual Obstacle Task (10 obstacles).", icon: "obstacle", kind: "info", info: info("Each candidate attempts up to 10 physical obstacles solo within a time limit, earning points per obstacle completed.", ["Attempt obstacles you're confident about first to bank points early.", "Follow the demonstrated technique for each obstacle rather than improvising unsafely.", "Keep moving — points come from obstacles attempted within the time limit, not from any single one."]) },
    { id: "command-task", dayId: "day-4", title: "Command Task", description: "You lead a small team you choose yourself.", icon: "command", kind: "info", info: info("You're given a task and told to pick 2-3 subordinates from the group to help you complete it, then briefed by the GTO afterward.", ["Choose subordinates for the task, not just your friends in the group.", "Give clear instructions rather than doing everything yourself.", "Be ready to explain your plan and reasoning to the GTO afterward."]) },
    { id: "fgt", dayId: "day-4", title: "FGT", description: "Final Group Task.", icon: "gto", kind: "info", info: info("A last group obstacle task, similar to the PGT, giving the GTO a final, focused look at your teamwork before individual tasks and the interview.", ["Treat it with the same seriousness as the PGT — it's still being assessed.", "Apply anything you learned about the group's dynamic from earlier tasks.", "Stay cooperative even if the group is tired by this point in the day."]) },
    { id: "personal-interview", dayId: "day-4", title: "Personal Interview", description: "One-on-one interview with the IO.", icon: "interview", kind: "bank", href: "/student/practice/interview", bank: { itemKind: "response", mode: "practice" }, responseItems: INTERVIEW_QUESTIONS },
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
    { id: "conference-questions", dayId: "day-5", title: "Conference Questions", description: "Practice common conference questions.", icon: "conference", kind: "bank", bank: { itemKind: "response", mode: "practice" }, responseItems: CONFERENCE_QUESTIONS },
    { id: "mock-conference", dayId: "day-5", title: "Mock Conference", description: "A walkthrough of the conference format.", icon: "conference", kind: "info", info: info("A short, informal run-through of how the real conference typically proceeds, to reduce surprises on the day.", ["Expect to wait — conferences often run candidate-by-candidate through the whole batch.", "Answer only what's asked; keep responses brief and direct.", "There's nothing to 'perform' here beyond being consistent with how you've behaved all week."]) },
    { id: "final-self-assessment", dayId: "day-5", title: "Final Self Assessment", description: "Rate yourself across the OLQs.", icon: "checklist", kind: "checklist" },
    { id: "ssb-journey-final-progress", dayId: "day-5", title: "SSB Journey / Final Progress", description: "Your full 5-day journey, at a glance.", icon: "finalProgress", kind: "summary" },
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
    };
    // itemIds is populated for every bank module that has real content, for
    // display purposes (a practice progress bar, or a static test question
    // count) — but only practice-mode itemIds are ever aggregated into
    // progress totals (getAllBankModuleItemIds, the Day 5 summary): test-mode
    // banks are a single timed submission with no per-item completion, so
    // counting their items as "done/not done" would only dilute the
    // percentage with items that can never individually be marked done.
    if (summary.bank) {
      const itemIds = (detail.mcqItems ?? detail.responseItems ?? []).map((item) => item.id);
      summary.bank = { ...summary.bank, itemIds };
    }
    return summary;
  });
}

export function getModuleDetail(dayId: SsbDayId, moduleId: string): SsbModuleDetail | undefined {
  return MODULE_DETAIL[dayId].find((m) => m.id === moduleId);
}

export function getAllModules(): SsbModuleDetail[] {
  return Object.values(MODULE_DETAIL).flat();
}

export { INTERVIEW_QUESTIONS };
