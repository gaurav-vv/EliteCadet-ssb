// Printable study material served as real PDFs (/student/resources/downloads).
// Rendered with a basic Helvetica text renderer: Latin-1 characters ONLY
// (plain ASCII plus en/em dashes). No emoji, currency symbols or smart quotes.

import type { PrintableDoc } from "@/types/resources";

export const PRINTABLE_DOCS: PrintableDoc[] = [
  // ---------------------------------------------------------------------------
  {
    slug: "ssb-documents-and-packing-checklist",
    title: "SSB documents and packing checklist",
    kind: "Checklist",
    category: "Interview Preparation",
    description: "A general list of documents, clothing and personal items to pack for your SSB.",
    blocks: [
      {
        heading: "Read this first",
        style: "text",
        lines: [
          "Always follow the exact list in your call-up letter. It is the final authority.",
          "This checklist is a general reminder of items candidates commonly carry.",
          "Keep originals and at least two sets of photocopies in separate folders.",
          "Pack the evening before and tick each item as it goes into your bag.",
        ],
      },
      {
        heading: "Documents",
        style: "check",
        lines: [
          "Call-up letter (original, plus photocopies).",
          "Class 10 certificate and marksheet (original and photocopies).",
          "Class 12 certificate and marksheet (original and photocopies).",
          "Graduation degree or marksheets, if applicable (original and photocopies).",
          "Government photo ID proof as specified in the call-up letter.",
          "Recent passport-size photographs (number as specified, plus spares).",
          "Any other certificate the call-up letter asks for (NCC, sports, etc.).",
          "A copy of your application form or admit card, if asked.",
          "Travel tickets and return booking details.",
        ],
      },
      {
        heading: "Stationery",
        style: "check",
        lines: [
          "Two or three blue or black pens.",
          "Pencils, eraser and sharpener.",
          "A small notebook for notes and current affairs revision.",
          "A clipboard or hard folder for writing.",
          "An envelope or file to keep documents flat and dry.",
        ],
      },
      {
        heading: "Clothing",
        style: "check",
        lines: [
          "Formal shirts or formal outfits for the interview and conference (at least two).",
          "Formal trousers, belt and dark socks.",
          "Polished formal shoes.",
          "Smart casual clothes for daily wear and travel.",
          "Sports kit: shorts or track pants, T-shirts and sports socks.",
          "Sports shoes in good condition.",
          "Sleepwear and enough undergarments for the stay.",
          "A sweater or jacket if the weather may be cold.",
        ],
      },
      {
        heading: "Personal and grooming items",
        style: "check",
        lines: [
          "Toothbrush, toothpaste, soap and shampoo.",
          "Comb, nail cutter and shaving kit if needed.",
          "Shoe polish and brush.",
          "Towel and handkerchiefs.",
          "Water bottle.",
          "Any regular medicine you take, with the prescription.",
          "A small amount of cash for minor expenses.",
          "Phone charger (follow centre rules on phone use).",
        ],
      },
      {
        heading: "Final checks before you leave home",
        style: "check",
        lines: [
          "Documents checked against the call-up letter list, item by item.",
          "Reporting date, time and place written down separately.",
          "Clothes ironed and packed to avoid creasing.",
          "Emergency contact numbers written on paper, not only stored in the phone.",
          "Family informed of your travel plan.",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: "tat-practice-worksheet",
    title: "TAT practice worksheet",
    kind: "Worksheet",
    category: "Psychology Tests",
    description: "Six written picture prompts with answer space and a self-review checklist for TAT practice.",
    blocks: [
      {
        heading: "How to use this worksheet",
        style: "text",
        lines: [
          "Read one prompt and imagine the scene as if it were a picture in front of you.",
          "Take about 30 seconds to observe and think, then write a story in about 4 minutes.",
          "Each story should say what led to the situation, what is happening, and how it ends.",
          "Give the main character a clear goal and show realistic actions towards it.",
          "Keep the story believable and the outcome practical; avoid dramatic or fantastical turns.",
          "After all six, use the self-review checklist at the end.",
        ],
      },
      {
        heading: "Picture prompts",
        style: "write",
        lines: [
          "1. A young woman stands outside a closed shop at dusk, holding a bag and looking down the road.",
          "2. Two students sit at a table with books open; one is pointing at a page while the other frowns.",
          "3. A man in work clothes stands beside a stalled tractor in a field, looking at the sky.",
          "4. A group of people gathers near a small bridge over a stream; one person is gesturing towards the water.",
          "5. A boy sits alone on the steps of a school building, holding a sheet of paper.",
          "6. An elderly person and a young person sit together in a room with a lamp and a letter on the table.",
        ],
      },
      {
        heading: "Self-review checklist",
        style: "check",
        lines: [
          "Each story has a clear beginning, middle and end.",
          "The main character has a goal I can name in one line.",
          "The character takes practical, believable actions.",
          "Other characters are involved naturally where it makes sense.",
          "The ending follows logically from the actions.",
          "I finished each story within about 4 minutes.",
          "My handwriting is legible and the story is easy to follow.",
          "The stories feel varied, not the same plot repeated.",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: "wat-practice-sheet",
    title: "WAT practice sheet",
    kind: "Worksheet",
    category: "Psychology Tests",
    description: "Sixty everyday practice words in four timed blocks, with a review checklist.",
    blocks: [
      {
        heading: "How to use this sheet",
        style: "text",
        lines: [
          "Cover all words except the one you are on, or ask someone to read them out.",
          "Give yourself about 15 seconds per word and write one short sentence.",
          "Write the first meaningful, natural thought; do not stop to polish it.",
          "Do one block of 15 at a time, then rest briefly before the next.",
          "Review all answers together at the end using the checklist.",
        ],
      },
      {
        heading: "Block 1",
        style: "write",
        lines: [
          "Team", "River", "Book", "Morning", "Help",
          "Friend", "Road", "Work", "Mother", "Game",
          "Rain", "Village", "Lesson", "Light", "Plan",
        ],
      },
      {
        heading: "Block 2",
        style: "write",
        lines: [
          "School", "Tree", "Market", "Train", "Doctor",
          "Letter", "Farmer", "Bridge", "Music", "Garden",
          "Teacher", "Water", "Exam", "Clock", "Hill",
        ],
      },
      {
        heading: "Block 3",
        style: "write",
        lines: [
          "Neighbour", "Field", "Window", "Journey", "Sport",
          "Brother", "Lamp", "Library", "Bicycle", "Festival",
          "Cloud", "Office", "Kitchen", "Sky", "Map",
        ],
      },
      {
        heading: "Block 4",
        style: "write",
        lines: [
          "Shop", "Sister", "Ground", "Story", "Practice",
          "Bus", "Flower", "Class", "Duty", "Home",
          "Paper", "Hospital", "Coach", "Path", "Evening",
        ],
      },
      {
        heading: "Review checklist",
        style: "check",
        lines: [
          "I completed most words within the time.",
          "Each response is a short, complete sentence.",
          "Responses are natural and practical, not forced or lecture-like.",
          "I avoided repeating the same sentence pattern too often.",
          "Words I left blank are noted for extra practice.",
          "My handwriting stayed legible under time pressure.",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: "srt-practice-sheet",
    title: "SRT practice sheet",
    kind: "Worksheet",
    category: "Psychology Tests",
    description: "Twenty everyday situations to practise quick, practical reaction responses.",
    blocks: [
      {
        heading: "How to use this sheet",
        style: "text",
        lines: [
          "Read each situation once and write what you would actually do.",
          "Aim for about 30 seconds per situation; one or two short sentences is enough.",
          "Describe action, not feelings or opinions about the situation.",
          "Be practical and realistic; consider others involved where relevant.",
        ],
      },
      {
        heading: "Situations",
        style: "write",
        lines: [
          "1. He reached the railway station and found his wallet missing. He...",
          "2. His team captain fell ill on the morning of an important match. He...",
          "3. She saw a cyclist knocked down by a car that drove away. She...",
          "4. His friend asked to copy his assignment the night before submission. He...",
          "5. The group project deadline is tomorrow and two members have not done their part. She...",
          "6. While trekking, the group lost the trail as it began to get dark. He...",
          "7. Her younger brother scored poorly in exams and is upset. She...",
          "8. He noticed smoke coming from a neighbour's locked house. He...",
          "9. On the bus, an elderly person was standing while young people were seated. She...",
          "10. He was asked to organise a blood donation camp in college with a week's notice. He...",
          "11. Her parents wanted her to choose a different career from the one she prefers. She...",
          "12. He was wrongly blamed by a teacher for breaking a lab instrument. He...",
          "13. During a flood, her village road was cut off and a neighbour needed medicine. She...",
          "14. His new hostel roommate keeps playing loud music late at night. He...",
          "15. She found a mobile phone on a park bench. She...",
          "16. He failed to clear a competitive exam on his first attempt. He...",
          "17. The bus she was on broke down on a highway far from town. She...",
          "18. His friends planned to bunk class for a movie and asked him to join. He...",
          "19. She was made in-charge of a school function and the chief guest cancelled at the last minute. She...",
          "20. He saw a child near the edge of a village pond with no adult around. He...",
        ],
      },
      {
        heading: "Review checklist",
        style: "check",
        lines: [
          "Every response states a clear action.",
          "Responses are realistic for a person of my age and resources.",
          "Where others were involved, I considered their safety and needs.",
          "I informed the right authority where one was clearly needed.",
          "I completed most situations within the time.",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: "thirty-day-ssb-study-plan",
    title: "30-day SSB study plan",
    kind: "Study plan",
    category: "Tips & Strategies",
    description: "A week-by-week plan with a daily routine to prepare steadily for your SSB in 30 days.",
    blocks: [
      {
        heading: "How to use this plan",
        style: "text",
        lines: [
          "Tick each item as you complete it; adjust the plan to your schedule and your call-up date.",
          "Consistency matters more than long hours: aim for 2 to 3 focused hours daily plus fitness.",
          "Review progress every Sunday and carry unfinished items into the next week.",
        ],
      },
      {
        heading: "Daily routine",
        style: "check",
        lines: [
          "Physical training: 30 to 45 minutes (running, strength, flexibility).",
          "Newspaper reading: 30 minutes; write three lines on one story.",
          "Psychology test practice: 30 to 45 minutes as per the week's focus.",
          "Speaking practice: one 3-minute talk or 10 minutes of interview questions aloud.",
          "Evening review: 10 minutes noting what went well and what to improve.",
          "Sleep 7 to 8 hours.",
        ],
      },
      {
        heading: "Week 1 – Foundations",
        style: "check",
        lines: [
          "Read about the SSB procedure: screening, psychology tests, GTO, interview, conference.",
          "Prepare your PIQ fact sheet from your certificates.",
          "Start a current affairs notebook with one page per area.",
          "Practise 2 TAT stories and 30 WAT words daily.",
          "Begin running 3 km and basic strength work.",
        ],
      },
      {
        heading: "Week 2 – Psychology tests",
        style: "check",
        lines: [
          "Practise 4 TAT stories daily within time.",
          "Practise 60 WAT words in one sitting, three times this week.",
          "Practise 30 SRT situations daily.",
          "Write a draft self-description and review it honestly.",
          "Do two group discussions with friends or online peers.",
        ],
      },
      {
        heading: "Week 3 – Group tasks",
        style: "check",
        lines: [
          "Solve 3 GPE practice scenarios with written plans and timings.",
          "Give 5 lecturettes on different topics with a timer.",
          "Practise 2 group discussions and review your contributions.",
          "Practise a mock obstacle circuit twice this week.",
          "Increase running to 4 to 5 km.",
        ],
      },
      {
        heading: "Week 4 – Interview and full revision",
        style: "check",
        lines: [
          "Hold 3 mock interviews based on your PIQ fact sheet.",
          "Practise rapid-fire questions daily.",
          "Revise your current affairs notebook and explain 10 topics aloud.",
          "Complete one full timed set of TAT, WAT and SRT.",
          "Prepare documents and packing using the checklist.",
        ],
      },
      {
        heading: "Final 2 days",
        style: "check",
        lines: [
          "Light revision only; no new material.",
          "Check travel, documents and clothing.",
          "Rest well and sleep early.",
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: "gto-and-interview-revision-notes",
    title: "GTO and interview revision notes",
    kind: "Revision notes",
    category: "Group Tasks",
    description: "Concise revision notes on GTO tasks, lecturette and the personal interview.",
    blocks: [
      {
        heading: "Group Discussion (GD)",
        style: "text",
        lines: [
          "Usually two rounds, informal and leaderless; no fixed speaking order.",
          "Use point – reason – example; keep each contribution under about 45 seconds.",
          "Enter at natural pauses with a short opener; speak firmly, not loudly.",
          "Build on others' points; disagree politely with a reason.",
          "Use only facts you are sure of.",
        ],
      },
      {
        heading: "Group Planning Exercise (GPE)",
        style: "text",
        lines: [
          "Stages: narration, reading time, individual written plan, group discussion.",
          "Note current time, resources, vehicles, speeds, distances and deadlines.",
          "Priorities: save life first, then prevent large-scale damage; give a reason for each.",
          "Split the group to handle problems in parallel; calculate realistic timings.",
          "Plan format: situation, priorities, actions with times, communication, regrouping.",
          "In the group stage, work towards one common plan.",
        ],
      },
      {
        heading: "PGT, HGT and FGT",
        style: "text",
        lines: [
          "Progressive Group Task: obstacles of increasing difficulty with helping material.",
          "Half Group Task: similar, with the group split into halves.",
          "Final Group Task: last group obstacle for the whole group.",
          "Listen to all rules; learn the colour code before starting.",
          "Propose ideas with a reason and invite feedback; accept better ideas.",
          "Help execute physically, not only verbally; help others across.",
          "If a rule is broken, acknowledge it and restart as instructed.",
        ],
      },
      {
        heading: "Individual Obstacles (IO)",
        style: "text",
        lines: [
          "Ten numbered obstacles attempted alone in about three minutes.",
          "Plan a route before your turn that minimises running.",
          "If you fail an obstacle, re-attempt once or move on immediately.",
          "Prioritise safety: land with bent knees and follow instructions.",
        ],
      },
      {
        heading: "Command Task",
        style: "text",
        lines: [
          "You lead a small team through an obstacle with helping material.",
          "Study the obstacle, then brief: aim, rules, plan.",
          "Direct execution, help physically where useful, adapt calmly.",
          "As a subordinate, follow willingly and suggest improvements politely.",
        ],
      },
      {
        heading: "Lecturette",
        style: "text",
        lines: [
          "About three minutes on a topic chosen from a card; short preparation time.",
          "Choose the topic you can speak on most sensibly; decide quickly.",
          "Structure: introduction, two or three body points with examples, conclusion.",
          "Write key words only; speak to the whole group at a steady pace.",
        ],
      },
      {
        heading: "Personal Interview",
        style: "text",
        lines: [
          "Know every entry in your PIQ form; questions often start from it.",
          "Themes: family, education, hobbies, friends, motivation, current affairs.",
          "Answer with specific details from your own life; avoid general statements.",
          "Be honest about weaknesses and explain what you did about them.",
          "Rapid-fire questions: answer in order, briefly; admit if you miss one.",
          "If you do not know something, say so plainly.",
        ],
      },
    ],
  },
];
