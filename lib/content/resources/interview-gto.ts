// Editorial content written for EliteCadet: Interview Preparation and Group
// Tasks articles. Plain strings only — rendered as text, never as HTML.

import type { ResourceArticle } from "@/types/resources";

export const INTERVIEW_GTO_RESOURCES: ResourceArticle[] = [
  // ---------------------------------------------------------------------------
  // 1. Interview day checklist
  // ---------------------------------------------------------------------------
  {
    slug: "interview-day-checklist",
    title: "SSB Interview day checklist",
    category: "Interview Preparation",
    description: "What to prepare, carry and review the night before your interview.",
    updatedOn: "2026-10-25",
    objectives: [
      "Know what to review in your PIQ form the evening before the interview.",
      "Prepare your clothing, documents and personal items so the morning is calm.",
      "Plan the waiting time on interview day so you stay fresh and composed.",
      "Understand simple conduct basics from the moment you enter the room to the moment you leave.",
    ],
    sections: [
      {
        id: "why-a-checklist",
        heading: "Why a checklist helps",
        paragraphs: [
          "The personal interview is a conversation with one interviewing officer, usually lasting anywhere from about twenty minutes to over an hour. It may be scheduled on any day of the testing period, and the exact time is often not known until the day itself. Many candidates lose composure not because of hard questions, but because of small avoidable problems: a crumpled shirt, a forgotten detail in their own PIQ form, or a sleepless night spent re-reading notes.",
          "A checklist removes those distractions. When the practical things are settled the evening before, your attention on the day goes where it belongs: listening carefully, thinking clearly and answering honestly. Treat the list below as a starting point and adjust it to the instructions you receive at your selection centre.",
        ],
      },
      {
        id: "review-your-piq",
        heading: "The evening before: review your PIQ",
        paragraphs: [
          "Your Personal Information Questionnaire is the interviewing officer's main reference about you. Questions frequently start from something you wrote: your school, your marks, your father's occupation, a sport you listed, a position of responsibility you held. Read your copy of the PIQ slowly, line by line, and ask yourself what a curious person might want to know about each entry.",
          "Do not try to memorise speeches. Instead, refresh facts you might blank on under mild pressure: years of passing, percentages, names of your school principal or class teacher, the size of your town, the achievements you listed and the exact level at which they happened (school, district, state). If you mentioned a hobby, be ready to talk about what you actually do in it and what you have learned.",
        ],
        bullets: [
          "Dates and percentages for Class 10, Class 12 and graduation, if applicable.",
          "Details of every sport, hobby and extracurricular activity you listed.",
          "Your responsibilities in any position you mentioned (monitor, captain, NCC rank, event coordinator).",
          "Basic facts about your hometown and district: population range, notable places, local issues.",
          "Your reasons for applying to this particular entry and service.",
        ],
        example: {
          label: "Turning a PIQ line into preparation",
          text: "PIQ entry: 'Hobby – Gardening.' Questions to prepare for: What do you grow? Since when? Who taught you? What went wrong recently and what did you do about it? What did gardening teach you? Preparation note: 'Started in Class 9 with my grandmother; grow tomatoes, chillies and tulsi on our terrace; lost a full batch of seedlings to over-watering last summer, now check soil moisture first; it taught me patience and routine.'",
        },
      },
      {
        id: "clothing-and-documents",
        heading: "Clothing, documents and personal items",
        paragraphs: [
          "Formal, clean and comfortable is the rule. For most candidates that means a well-fitted formal shirt, trousers, a belt, polished formal shoes and dark socks; a tie or blazer may be suitable depending on the weather and the instructions you receive. Women candidates may wear formal Western or Indian formal attire that is neat and comfortable. Iron your clothes the night before and keep a spare shirt ready in case of a stain.",
          "Keep your documents in one folder in the order requested by the centre. Always follow the exact list in your call-up letter; the items below are only a general reminder.",
        ],
        bullets: [
          "Call-up letter and any documents it asks you to carry, with photocopies.",
          "Your own copy of the PIQ form if you kept one, for revision only.",
          "A pen, a small notebook and a handkerchief.",
          "Grooming basics: comb, nail cutter, shoe polish and brush.",
          "A water bottle and any regular medication you take.",
        ],
      },
      {
        id: "sleep-food-routine",
        heading: "Sleep, food and the morning routine",
        paragraphs: [
          "A rested mind recalls facts faster and handles unexpected questions more calmly. Stop serious revision early in the evening, eat a normal dinner and aim for a full night's sleep. Late-night cramming of current affairs rarely adds anything meaningful at this stage and usually costs you clarity the next day.",
          "In the morning, wake early enough to get ready without hurrying. Eat a light breakfast you are used to; this is not the day to try new food. Reach the assembly point a little before the stated time so that you are not rushing in out of breath.",
        ],
      },
      {
        id: "waiting-time",
        heading: "Using the waiting time well",
        paragraphs: [
          "Candidates are often interviewed one by one, so you may wait for a long time. Waiting is tiring if you spend it worrying. Sit comfortably, keep your clothes from creasing and avoid long, anxious discussions with other candidates about what questions were asked. Every interview is different, and second-hand accounts usually raise anxiety without helping.",
          "A useful way to spend the time is a quiet, light review: glance at your PIQ copy, recall two or three news items you understand well, and remind yourself of the reasons you want to join. Then stop and simply rest.",
        ],
      },
      {
        id: "conduct-in-the-room",
        heading: "Conduct in the interview room",
        paragraphs: [
          "Knock or ask for permission before entering, greet the officer politely and wait to be offered a seat. Sit upright but relaxed, keep your hands still, and look at the officer while speaking. Simple courtesy, not rehearsed gestures, creates a good impression.",
          "Listen to the full question before answering. If a question is long, it is perfectly acceptable to take a moment to organise your thoughts, or to ask for a question to be repeated if you genuinely did not hear it. If you do not know something, say so plainly; an honest 'I am not sure, sir, but I will find out' is far better than a guess presented as fact. At the end, thank the officer, rise and leave calmly.",
        ],
        example: {
          label: "Handling a question you cannot answer",
          text: "Weak: 'Yes sir, the scheme was launched in, uh, 2018 I think, and it covers all states...' (guessing). Better: 'I have read about the scheme in the news, sir, but I do not remember the launch year or the exact coverage. I know its main aim is to provide health cover for low-income families. I will read up on the details.'",
        },
      },
    ],
    exercises: [
      {
        title: "PIQ question map",
        instructions: "Take your PIQ copy and, beside every entry, write at least two questions someone could ask about it. Answer each aloud in under one minute. Mark any answer where you hesitated and gather the missing facts.",
      },
      {
        title: "Night-before dry run",
        instructions: "One week before your SSB, do a full rehearsal: iron your interview clothes, lay out your document folder against your call-up letter, and polish your shoes. Note anything missing and fix it now rather than on the last evening.",
      },
      {
        title: "Mock interview with a timer",
        instructions: "Ask a family member or friend to interview you for 25 minutes using only your PIQ copy. Ask them to note moments where you rambled, guessed or contradicted something written in the form.",
      },
    ],
    takeaways: [
      "Your PIQ form is the backbone of the interview; know every entry in it well.",
      "Settle clothing, documents and grooming the night before so the morning is calm.",
      "Sleep and a normal routine help more than last-minute cramming.",
      "Courtesy, attentive listening and honest answers matter more than polished lines.",
      "Always follow the exact instructions in your call-up letter and at the centre.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. Personal interview question themes
  // ---------------------------------------------------------------------------
  {
    slug: "personal-interview-question-themes",
    title: "Personal interview: common question themes and how to prepare",
    category: "Interview Preparation",
    description: "The broad areas interview questions come from, with sample questions and honest answer structures.",
    updatedOn: "2026-10-25",
    objectives: [
      "Recognise the main themes that personal interview questions usually come from.",
      "Prepare honest, specific answers using a simple structure instead of memorised scripts.",
      "Handle a burst of rapid-fire questions calmly and in order.",
      "Build a steady habit of current affairs reading you can actually discuss.",
    ],
    sections: [
      {
        id: "how-the-interview-works",
        heading: "How the personal interview generally works",
        paragraphs: [
          "The personal interview is a one-to-one conversation with an interviewing officer. Its purpose, broadly, is to understand you as a person: your background, how you think, how you relate to people, and why you want to serve. It is not a quiz, and there is no fixed list of correct answers. Two candidates can give completely different answers to the same question and both be perfectly honest and reasonable.",
          "Because of this, the most reliable preparation is self-knowledge, not rehearsed lines. Know your own life well, think about what you have learned from it, and be able to express that clearly. The themes below are widely known areas that questions tend to come from. Use them to reflect, not to script.",
        ],
      },
      {
        id: "background-and-family",
        heading: "Background, family and hometown",
        paragraphs: [
          "Expect questions about where you grew up, your family members and what they do, your relationship with them, and your hometown. These questions help the officer understand the environment that shaped you. Answer naturally and with specific details; vague answers such as 'my family is very supportive' say little.",
          "Know basic facts about your hometown and state: what it is known for, its main economic activities, a current local issue, and what you would change if you could. If your family has moved often, be ready to talk about how you adjusted.",
        ],
        bullets: [
          "Tell me about yourself and your family.",
          "Who are you closest to at home, and why?",
          "What does your father or mother do, and what have you learned from them?",
          "What are the main problems in your town, and what could be done about them?",
          "How do you help at home?",
        ],
        example: {
          label: "Weak vs better: 'Tell me about your family'",
          text: "Weak: 'Sir, my family is very good and supportive. My father works and my mother is a housewife. I have one sister.' Better: 'Sir, we are four at home. My father runs a small hardware shop in our town, and I help him on Sundays with stock and accounts. My mother manages the house and also tutors a few children in our colony in the evenings. My younger sister is in Class 9 and wants to study medicine; I help her with physics. I am closest to my mother – she is the one I discuss most decisions with.'",
        },
      },
      {
        id: "education-and-academics",
        heading: "Education and academics",
        paragraphs: [
          "Questions here cover your schools and college, subjects, marks, favourite and least favourite subjects, teachers, and any dip or improvement in performance. If your marks dropped in a particular year, do not hide it or blame others. Briefly state the reason honestly and what you did afterwards.",
          "Be ready for a few basic questions from your own subjects. A science student may be asked a simple concept question; a commerce student may be asked about a basic accounting idea. These are not meant to trap you; they check whether you understand what you have studied.",
        ],
        bullets: [
          "Why did you choose this stream or degree?",
          "Which subject do you find hardest, and how do you deal with it?",
          "Your marks fell in Class 11. What happened?",
          "Which teacher influenced you the most, and how?",
        ],
        example: {
          label: "Explaining a dip in marks",
          text: "Weak: 'The paper was very tough and the teachers did not teach properly.' Better: 'In Class 11 I spent too much time on cricket trials and fell behind in maths; I got 61 percent in the half-yearly. I made a weekly timetable, joined my friend's evening study group and asked my teacher for extra problems. In the final exam I scored 78 percent. I learned to plan my time instead of reacting at the last moment.'",
        },
      },
      {
        id: "hobbies-sports-friends",
        heading: "Hobbies, sports and friends",
        paragraphs: [
          "Anything you list as a hobby or sport is likely to be explored in some depth, so list only what you genuinely do. If you write 'reading', expect to be asked which books you read recently, what they were about and what you took from them. If you write 'football', expect questions about your position, the rules, recent matches you played and famous players.",
          "Questions about friends help the officer understand how you relate to people. Know your close friends well: what they do, why you are friends, and a time you helped each other or disagreed. It is fine to say you had a disagreement, as long as you can explain how it was resolved.",
        ],
        bullets: [
          "What did you do last Sunday?",
          "Tell me about your best friend. What do you like and dislike about them?",
          "What is the offside rule? What position do you play?",
          "Which was the last book you read? What did you learn from it?",
          "Have you ever had a fight with a friend? What happened?",
        ],
      },
      {
        id: "motivation-for-the-forces",
        heading: "Motivation for the forces",
        paragraphs: [
          "You will very likely be asked why you want to join the armed forces, and why this particular service or entry. Answers like 'to serve the nation' are sincere but too general by themselves. Connect your motivation to your own experiences: people you met, something you saw, the kind of life you want, and what you know about the work.",
          "Know basic facts about the service you are applying to: its broad role, the training academy for your entry, the duration of training, and general information about ranks. Also be honest about your backup plan; having one shows maturity, not lack of commitment.",
        ],
        example: {
          label: "Weak vs better: 'Why do you want to join the Army?'",
          text: "Weak: 'Sir, I want to serve the nation and I like the uniform and discipline.' Better: 'Sir, my interest began in NCC, where our camp was run by a JCO who knew every cadet by name and fixed problems before we noticed them. I enjoyed being responsible for a section of ten cadets at the annual camp and want a career where leading people is the main job, not a side task. I have also spoken to a family friend who is a Captain about postings and field life, so I have a realistic picture. If I am not recommended this time, I will complete my degree and apply again through CDS.'",
        },
      },
      {
        id: "current-affairs-awareness",
        heading: "Current affairs and general awareness",
        paragraphs: [
          "The officer may ask about national or international events, defence news, or issues affecting your state. Depth matters more than breadth here. It is better to understand five important topics well – what happened, why it matters, and two sides of the debate – than to know a hundred headlines.",
          "Build a daily habit: read one reliable newspaper or its digital edition for 30 minutes, and write three lines about one story each day. When asked your opinion, give it with a reason and acknowledge the other view where relevant. If you do not know about something, say so.",
        ],
        bullets: [
          "What is the most important news this week, in your opinion? Why?",
          "What do you know about India's relations with a neighbouring country?",
          "What problems does your state face currently?",
          "What is your view on a recent policy you have read about?",
        ],
      },
      {
        id: "rapid-fire-questions",
        heading: "Handling rapid-fire questions",
        paragraphs: [
          "Sometimes the officer asks a string of questions together, for example: 'Tell me about your school, your best teacher, your favourite subject, your marks in Class 10 and 12, what games you played, and what responsibilities you held.' This tests memory and organisation under mild pressure.",
          "Listen calmly and note the sequence mentally. Answer in the same order, briefly, one by one. If you forget one item, it is fine to say so honestly rather than skip it silently. Practice is the only real preparation: have a friend fire six to eight linked questions at you and answer in order.",
        ],
        example: {
          label: "Answering a rapid-fire set in order",
          text: "Question: 'Your school, best teacher, favourite subject, Class 10 marks, games and responsibilities?' Answer: 'Sir, I studied at a government senior secondary school in my town. My best teacher was my chemistry teacher, because she made us do experiments ourselves. My favourite subject is chemistry. I scored 84 percent in Class 10. I played volleyball for the school team. I was the class monitor in Class 11 and helped organise our annual sports day.'",
        },
      },
    ],
    exercises: [
      {
        title: "Theme notebook",
        instructions: "Make one page for each theme in this article. On each page write five likely questions and bullet-point facts or experiences you would draw on – not full answers. Review and add to it every few days.",
      },
      {
        title: "Weak-to-better rewrite",
        instructions: "Write your first honest answer to 'Why do you want to join the forces?' Then rewrite it with at least two specific experiences or facts from your own life. Read both aloud and compare.",
      },
      {
        title: "Rapid-fire drill",
        instructions: "Ask a friend to read out eight linked questions about your background in one go. Answer them in order. Repeat with a new set daily for one week and note how many you answer in the correct sequence.",
      },
      {
        title: "Current affairs three-liner",
        instructions: "For 14 days, pick one news story daily and write three lines: what happened, why it matters, and your view with one reason. At the end, explain any five stories aloud without notes.",
      },
    ],
    takeaways: [
      "Interview questions come from your own life, so self-knowledge is the best preparation.",
      "Specific details from real experience make answers credible; general statements do not.",
      "Be honest about weaknesses, dips and gaps, and explain what you did about them.",
      "Answer rapid-fire questions in order, briefly, and admit it if you miss one.",
      "Understand a few current issues deeply rather than many headlines superficially.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. PIQ form preparation
  // ---------------------------------------------------------------------------
  {
    slug: "piq-form-preparation",
    title: "Preparing your PIQ form and answering from it",
    category: "Interview Preparation",
    description: "Fill your PIQ form accurately and prepare to discuss every entry in it with confidence.",
    updatedOn: "2026-10-25",
    objectives: [
      "Understand what the PIQ form contains and why it matters across the SSB.",
      "Fill the form accurately, consistently and legibly.",
      "Avoid common mistakes such as exaggeration, vague entries and listing unfamiliar hobbies.",
      "Prepare to discuss every entry in the form during the interview.",
    ],
    sections: [
      {
        id: "what-is-the-piq",
        heading: "What the PIQ form is",
        paragraphs: [
          "The Personal Information Questionnaire, usually called the PIQ form, is filled in by each candidate at the selection centre, typically early in the testing period. It asks for factual information about you: personal details, family background, education with marks, sports and games, hobbies, extracurricular activities, positions of responsibility, NCC experience if any, and previous SSB attempts.",
          "The form is a reference document. The interviewing officer generally uses it as a starting point for questions, and it may also be seen by other assessors. Because it describes your life, it should be completely truthful. Anything you write may be discussed, so write only what you can talk about comfortably.",
        ],
      },
      {
        id: "before-you-reach-the-centre",
        heading: "Preparing before you reach the centre",
        paragraphs: [
          "You usually cannot take a pre-filled form inside, but you can prepare the information beforehand. Collect your exact marks and years of passing, the full names of your schools and college, your parents' occupations and qualifications, and details of any sports, competitions or positions you held, with the level and year of each.",
          "Make a fact sheet at home and check it against your certificates. Spelling of names, dates and percentages should match your documents exactly. This avoids hurried guesses at the centre and small inconsistencies that cause needless questions later.",
        ],
        bullets: [
          "Exact percentages or grades and years of passing for every examination.",
          "Full names and locations of schools and colleges attended.",
          "Parents' and siblings' education and occupation details.",
          "Sports, with the level played (house, school, district, state) and year.",
          "Positions of responsibility, with what you actually did in each.",
          "Previous SSB attempts, if any: dates, entry and centre.",
        ],
      },
      {
        id: "filling-it-correctly",
        heading: "Filling the form correctly",
        paragraphs: [
          "Read every instruction before writing. Write in clear, legible capitals or neat handwriting as instructed, and use the same format for dates throughout. Keep entries short and factual. If a column does not apply to you, follow the instructions given for that case rather than leaving it ambiguous.",
          "Be precise about levels and roles. Writing 'Captain, Football' when you captained the house team in Class 8 creates a different impression from what really happened, and you will have to explain it. 'House football team captain, Class 8' is accurate and still worth mentioning.",
        ],
        example: {
          label: "Vague vs precise entries",
          text: "Vague: 'Hobbies: reading, music, travelling.' Precise: 'Hobbies: reading Hindi and English fiction; playing the harmonium (learning for two years).' Vague: 'Sports: cricket, football, athletics.' Precise: 'Sports: cricket – school team, Class 10 to 12, opening batsman; athletics – 400 m, district level, 2024.'",
        },
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes to avoid",
        paragraphs: [
          "The most common mistake is listing hobbies or interests to sound impressive. If you write 'chess' but cannot explain basic openings, or 'trekking' but have done one trip, the conversation becomes uncomfortable. It is perfectly fine to list ordinary interests you genuinely enjoy.",
          "Other avoidable mistakes include inconsistent dates, exaggerated responsibilities, overwriting and cutting, and leaving blank fields without reason. None of these is dramatic on its own, but together they suggest carelessness about a document that describes your own life.",
        ],
        bullets: [
          "Listing hobbies you do not actively pursue.",
          "Inflating levels: writing 'state level' for a district-level event.",
          "Mismatched dates or marks compared with your certificates.",
          "Cramped, illegible handwriting or heavy overwriting.",
          "Writing long sentences where a short fact is asked.",
        ],
      },
      {
        id: "answering-from-the-piq",
        heading: "Answering questions from your PIQ",
        paragraphs: [
          "Once the form is filled, go through every entry and imagine follow-up questions. For each hobby: what exactly, since when, how often, what you learned. For each position: what was the responsibility, what challenges came up, what you did. For each dip in marks: what happened and how you responded.",
          "A simple structure works for most PIQ-based answers: state the fact, add a specific detail, and finish with what you learned or what you do now. This keeps answers short, concrete and honest, and leaves room for the officer to ask more.",
        ],
        example: {
          label: "Fact – detail – learning",
          text: "Question: 'You were the cultural secretary in college. What did you do?' Answer: 'Sir, I was elected cultural secretary in my second year (fact). I coordinated our annual fest with a team of twelve students; the hardest part was when our main sponsor withdrew two weeks before, so we cut two events and raised the balance through stalls run by each department (detail). I learned to plan with a fallback and to share the load instead of doing everything myself (learning).'",
        },
      },
      {
        id: "consistency-across-the-ssb",
        heading: "Consistency across the SSB",
        paragraphs: [
          "Your PIQ, your written psychology responses, your self-description, your behaviour in group tasks and your interview answers all describe the same person. You do not need to engineer consistency; it follows naturally when you are honest everywhere. Trying to present a different, idealised person in each test is tiring and tends to show.",
          "If something in your form is likely to draw attention, such as a gap year, a change of stream or a previous attempt, think through an honest explanation in advance. Explain calmly what happened and what you did with the time, without defensiveness.",
        ],
      },
    ],
    exercises: [
      {
        title: "Build your fact sheet",
        instructions: "Using your certificates, prepare a one-page fact sheet with every date, mark, school name and achievement you will need for the PIQ. Check every number against the original document.",
      },
      {
        title: "Follow-up question drill",
        instructions: "Fill a practice PIQ from your fact sheet. For each entry, write three follow-up questions and answer each using the fact – detail – learning structure in under 45 seconds.",
      },
      {
        title: "Honesty audit",
        instructions: "Read your practice PIQ and mark every entry you would feel uncomfortable discussing for five minutes. Either gather the knowledge to discuss it properly or remove the claim.",
      },
    ],
    takeaways: [
      "The PIQ form is a factual record of your life and a starting point for the interview.",
      "Prepare a verified fact sheet before you reach the centre.",
      "Be precise about levels, roles and dates; never exaggerate.",
      "List only hobbies and activities you can discuss in depth.",
      "Use fact, detail and learning to answer PIQ-based questions concisely.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. GTO tasks: effective participation
  // ---------------------------------------------------------------------------
  {
    slug: "gto-tasks-effective-participation",
    title: "Effective participation in GTO tasks",
    category: "Group Tasks",
    description: "How to contribute, take initiative and work with your group.",
    updatedOn: "2026-10-25",
    objectives: [
      "Know the usual sequence of GTO tasks and what each broadly involves.",
      "Understand participation as useful contribution, not volume or dominance.",
      "Learn practical habits for taking initiative while supporting the group.",
      "Use Officer Like Qualities as a general framework for reflecting on your conduct.",
    ],
    sections: [
      {
        id: "the-gto-series",
        heading: "The GTO series at a glance",
        paragraphs: [
          "The Group Testing Officer's tasks are usually conducted over the third and fourth days of the SSB. A group of candidates goes through a series of indoor and outdoor tasks while a Group Testing Officer observes. The commonly described sequence is below; the exact order and details may vary by centre.",
          "Each task places you in a slightly different situation: speaking in a group, planning on paper, solving a practical problem with your group, acting alone against the clock, leading a small team, and speaking alone to the group. Across all of them, what matters is how you think, act and relate to others, not whether you look impressive at any single moment.",
        ],
        bullets: [
          "Group Discussion (GD): usually two rounds on given topics.",
          "Group Planning Exercise (GPE): a written and discussed plan for a problem set on a map model.",
          "Progressive Group Task (PGT): obstacles of increasing difficulty using helping material, with rules.",
          "Group Obstacle Race or snake race: groups compete over obstacles while carrying a snake-like load.",
          "Half Group Task (HGT): like PGT, with the group split into halves.",
          "Lecturette: a short talk by each candidate on a chosen topic.",
          "Individual Obstacles (IO): ten obstacles attempted alone in three minutes.",
          "Command Task: you lead a small team of your choosing through an obstacle.",
          "Final Group Task (FGT): one last group obstacle task for the whole group.",
        ],
      },
      {
        id: "what-participation-means",
        heading: "What effective participation means",
        paragraphs: [
          "Participation is often misunderstood as being the loudest or the busiest. In practice, effective participation means making useful contributions at the right time: offering a workable idea, improving someone else's idea, physically helping to execute the plan, keeping track of rules, and encouraging the group when progress slows.",
          "A candidate who gives one sound idea, accepts a better idea from someone else and then works hard to execute it contributes more than one who shouts five ideas and argues over each. Quality, timing and cooperation matter more than quantity.",
        ],
      },
      {
        id: "taking-initiative",
        heading: "Taking initiative without dominating",
        paragraphs: [
          "Initiative means acting when action is needed: proposing an idea when the group is stuck, picking up the helping material first, or stepping onto the obstacle to test a plan. It does not mean overruling others or ignoring their suggestions.",
          "A good habit is to propose with a reason and then invite responses: 'Let us place the plank across from the drum to the near pole – it is the shorter gap. Does anyone see a problem with that?' If someone points out a flaw, accept it gracefully and adjust. Flexibility is a strength, not a sign of weakness.",
        ],
        example: {
          label: "Two ways to propose an idea in a PGT",
          text: "Dominating: 'No, no, listen to me, plank goes here, everybody move!' Constructive: 'The red area is out of bounds, so we cannot rest the plank there. If we lay the plank from the drum to the pole and then pull the rope across, we can move everyone over. Rahul, can you hold the base of the drum while I test it?'",
        },
      },
      {
        id: "rules-and-safety",
        heading: "Rules, safety and the helping material",
        paragraphs: [
          "Outdoor tasks come with rules, typically about colour codes (areas or parts that cannot be touched), what helping material can be used and how, and how the group must cross. Listen carefully when the GTO explains them, and if something is unclear, ask a respectful question at that time.",
          "Following the rules is part of the task, not an obstacle to it. If someone breaks a rule, point it out calmly and help the group restart from the correct position as instructed. Prioritise safety: do not jump from heights recklessly, and help groupmates over difficult portions.",
        ],
        bullets: [
          "Listen to all rules before touching anything.",
          "Learn the colour code for the task and remind others politely.",
          "Use helping material only in permitted ways.",
          "If a rule is broken, acknowledge it honestly and follow the restart instruction.",
          "Help weaker or tired members across; the group finishes together.",
        ],
      },
      {
        id: "olq-framework",
        heading: "Officer Like Qualities as a reflection framework",
        paragraphs: [
          "Officer Like Qualities, often called OLQs, are a widely discussed general framework of qualities expected in an officer, grouped broadly into how one thinks (reasoning, organising, expression), how one relates to others (social adaptability, cooperation, responsibility), how one acts (initiative, confidence, decisiveness, influence, determination) and dynamism or stamina. The list is public in many forms and is useful for self-reflection.",
          "Use the framework to review your own practice, not to perform. Trying to visibly 'show' qualities in each task usually looks artificial. Instead, after a practice session, ask yourself honest questions: Did I listen before speaking? Did I contribute physically as well as verbally? Did I keep going when the plan failed? Did I help someone who was struggling?",
        ],
      },
      {
        id: "after-each-task",
        heading: "Reflecting after each practice task",
        paragraphs: [
          "Real improvement comes from honest review. After each practice task, spend five minutes noting what you did, what worked, what did not, and what you would do differently. Ask a friend who watched you for one strength and one improvement.",
          "Over a few weeks, patterns emerge: perhaps you contribute well early but go quiet when your idea is rejected, or you work hard physically but rarely speak. Pick one habit to improve at a time.",
        ],
      },
    ],
    exercises: [
      {
        title: "Backyard obstacle problem",
        instructions: "With four or five friends, set up a simple problem using two buckets, a plank and a rope, with rules such as 'the ground between the buckets is out of bounds'. Attempt it together, then each person names one idea they gave and one time they helped execute someone else's idea.",
      },
      {
        title: "Propose-and-invite practice",
        instructions: "In your next group activity of any kind, practise proposing at least two ideas using the pattern: idea, reason, invitation for feedback. Afterwards, write down how others responded and whether you adjusted.",
      },
      {
        title: "Weekly self-review",
        instructions: "After every practice session for four weeks, write four lines: what I contributed, how I cooperated, what I would change, and one habit to work on next time.",
      },
    ],
    takeaways: [
      "The GTO series moves from discussion to planning to practical, individual and leadership tasks.",
      "Effective participation is useful, timely contribution – not volume.",
      "Propose ideas with a reason, invite feedback and accept better ideas gracefully.",
      "Rules and safety are part of the task; follow them and help others follow them.",
      "Use Officer Like Qualities for honest self-reflection, not as a performance checklist.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Group discussion
  // ---------------------------------------------------------------------------
  {
    slug: "group-discussion-skills",
    title: "Group discussion: being heard without dominating",
    category: "Group Tasks",
    description: "Practical techniques to contribute clearly, listen actively and stay composed in an SSB group discussion.",
    updatedOn: "2026-10-25",
    objectives: [
      "Understand the format of the SSB group discussion and its informal nature.",
      "Learn to enter the discussion, make a clear point and give way to others.",
      "Build content through regular reading on common discussion areas.",
      "Avoid common pitfalls such as shouting, interrupting and repeating points.",
    ],
    sections: [
      {
        id: "format",
        heading: "The format",
        paragraphs: [
          "The group discussion is usually the first GTO task. The group sits in a semicircle and discusses a topic, typically for around fifteen to twenty minutes per round. There are commonly two rounds, and in one of them the group may be allowed to choose from a few topics. There is no formal chair, no fixed speaking order and no requirement to reach a conclusion, though the discussion should stay purposeful.",
          "Topics are usually on social, national or general issues: education, technology, environment, youth, sports, governance and so on. You are not expected to be an expert. What helps most is having sensible points, expressing them clearly, and engaging respectfully with what others say.",
        ],
      },
      {
        id: "making-your-point",
        heading: "Making a clear point",
        paragraphs: [
          "A good contribution is short and structured: a point, a reason, and an example. Thirty to forty-five seconds is usually enough. Speak at a normal pace and volume so that everyone can hear. Long monologues lose the group's attention and take time away from others.",
          "Link your point to the discussion where possible. Saying 'Building on what was said about rural schools...' shows you are listening and keeps the discussion connected rather than becoming a series of separate speeches.",
        ],
        example: {
          label: "A structured contribution",
          text: "Topic: 'Should social media be regulated?' Contribution: 'I agree some regulation is needed, mainly for misinformation (point). False forwards spread faster than corrections, and they can create panic during emergencies (reason). For example, during a flood or a cyclone, an unverified forward about a rescue point can send volunteers and families to the wrong place (example). So platforms should be required to label and slow down unverified viral content, without blocking ordinary expression.'",
        },
      },
      {
        id: "entering-the-discussion",
        heading: "Entering when the discussion is noisy",
        paragraphs: [
          "SSB discussions can become noisy, with several people speaking at once. Shouting over others rarely works and creates a poor atmosphere. Instead, wait for a natural pause, which comes more often than it seems, and enter with a short phrase that signals you are about to add something: 'I would like to add one point...' or 'There is another side to this...'.",
          "If you start at the same moment as someone else, it is courteous to let them continue and then come in after them. If the group is completely chaotic, a calm request such as 'Let us hear one person at a time' can help everyone, as long as it is not used to grab the floor for yourself.",
        ],
        bullets: [
          "Watch for pauses at the end of someone's sentence.",
          "Use a short opener to signal your entry.",
          "Speak firmly and clearly, not loudly.",
          "If you collide with another speaker, give way and come in next.",
        ],
      },
      {
        id: "listening-and-building",
        heading: "Listening and building on others",
        paragraphs: [
          "Active listening is visible: you look at the speaker, you refer to what they said, and your points respond to the discussion rather than to a script prepared in your head. Agreeing with a good point and adding to it is a valuable contribution. Disagreeing is also fine, as long as you disagree with the idea politely, give a reason and do not make it personal.",
          "If a quieter member has been trying to speak, inviting them in can help the group: 'I think he was about to say something.' Do it genuinely, not as a tactic.",
        ],
        example: {
          label: "Disagreeing respectfully",
          text: "Weak: 'That is completely wrong, you do not know about villages.' Better: 'I see the point about online classes saving cost, but in many villages connectivity is still unreliable. Perhaps a mixed model – online content with local teachers – would address both concerns.'",
        },
      },
      {
        id: "building-content",
        heading: "Building content for discussions",
        paragraphs: [
          "Good content comes from steady reading, not memorised facts. Read a newspaper daily and keep a small notebook organised by area: education, health, environment, technology, economy, defence, sports, social issues. For each area, note two or three issues with points for and against.",
          "When you use numbers, use only figures you are sure of and mention where they come from in general terms. If unsure, describe the trend in words instead. A wrong number stated confidently weakens an otherwise good point.",
        ],
      },
      {
        id: "common-pitfalls",
        heading: "Common pitfalls",
        paragraphs: [
          "Most pitfalls in group discussions come from anxiety: the fear of not speaking enough leads people to interrupt, shout or repeat points already made. Remember that contributions are about quality and relevance.",
          "Equally, staying completely silent leaves you without any contribution. If you find it hard to start, aim to make your first point within the first few minutes so the anxiety eases.",
        ],
        bullets: [
          "Shouting or speaking over others repeatedly.",
          "Repeating a point already made without adding anything.",
          "Long speeches that leave no room for others.",
          "Personal remarks or mocking another person's view.",
          "Using facts or figures you are not sure about.",
          "Staying silent for the entire round.",
        ],
      },
    ],
    exercises: [
      {
        title: "Point–reason–example drill",
        instructions: "Pick five topics from the news. For each, write two points using point, reason and example, each under 60 words. Say them aloud with a timer and keep each under 45 seconds.",
      },
      {
        title: "Mock discussion with an observer",
        instructions: "Hold a 15-minute discussion with five to eight friends. One person observes and notes for each speaker: number of entries, average length, interruptions, and whether points built on others. Discuss the notes afterwards.",
      },
      {
        title: "Area notebook",
        instructions: "Create a notebook with one page per area (education, health, environment, technology, economy, defence, sports, social issues). Add two issues per area each week with arguments on both sides.",
      },
    ],
    takeaways: [
      "The SSB group discussion is informal and leaderless; quality of contribution matters most.",
      "Use point, reason and example to keep contributions short and clear.",
      "Enter at natural pauses with a short opener; speak firmly, not loudly.",
      "Build on others' points and disagree politely with reasons.",
      "Use only facts you are sure of; describe trends in words when unsure.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. Group Planning Exercise
  // ---------------------------------------------------------------------------
  {
    slug: "group-planning-exercise",
    title: "Group Planning Exercise: a step-by-step method",
    category: "Group Tasks",
    description: "A practical method to read a GPE model, set priorities, allocate resources and present a workable plan.",
    updatedOn: "2026-10-25",
    objectives: [
      "Understand the stages of the GPE: narration, individual written plan and group discussion.",
      "Read the model and the narrative carefully to extract resources, time and distances.",
      "Prioritise problems sensibly and allocate people and transport realistically.",
      "Contribute to the group's common plan and present it clearly if asked.",
    ],
    sections: [
      {
        id: "how-gpe-works",
        heading: "How the GPE generally works",
        paragraphs: [
          "The Group Planning Exercise is usually conducted indoors after the group discussion. The group sits around a model or map that shows an area: villages, roads, a river, a railway line, forests and so on. The GTO narrates a situation: a group of young people is in the area for some reason when several problems occur at once, such as an accident, a fire, a bomb planted on a railway line, or a medical emergency.",
          "Candidates then typically get a few minutes to re-read the narrative, about ten minutes to write their individual plans, and around twenty minutes for a group discussion to arrive at a common plan. One member may be asked to present the group's plan. Exact timings vary, so follow the instructions given.",
        ],
      },
      {
        id: "reading-the-model",
        heading: "Reading the model and the narrative",
        paragraphs: [
          "During the narration, listen carefully and note the key facts. Write down the current time, the resources available (people, vehicles, tools, money, phones), distances, speeds of transport, and the timing of each problem. Look at the model to understand where everything is and which routes connect them.",
          "Many plans fail because of a misread detail: a jeep that only seats four, a bridge that is broken, a train due at a specific time. Re-read the narrative card when it is available and check every resource and time before you plan.",
        ],
        bullets: [
          "Current time and any deadlines (train time, bomb timer, patient's condition).",
          "Group members: number, and any special skills mentioned.",
          "Vehicles and their speed and capacity.",
          "Distances between key points.",
          "Tools and material: rope, first aid kit, phone, torch.",
          "Nearby help: police station, hospital, fire station, telephone.",
        ],
      },
      {
        id: "setting-priorities",
        heading: "Setting priorities",
        paragraphs: [
          "Most GPE situations contain more problems than can be solved one after another, so the plan depends on priorities. A widely used principle is to place saving human life first, then preventing major damage or danger to many people, then less urgent problems. Time-bound threats, such as a train about to pass a damaged track, often rank high because the consequence is large and the window is fixed.",
          "Write a short reason for each priority. The reasons matter as much as the order: they show your thinking and help the group agree. Where two priorities are close, a plan that tackles both at once by splitting the group is often better than a strict sequence.",
        ],
      },
      {
        id: "allocating-resources",
        heading: "Allocating people and transport",
        paragraphs: [
          "Once priorities are clear, divide the group so that problems are handled in parallel. Assign the fastest available transport to the most time-critical task. Inform the police, hospital or relevant authority as early as possible when a phone or a nearby station is available. Keep timings realistic: calculate travel time from distance and speed rather than guessing.",
          "Make sure no member is idle and no task is left without a person. After the main problems are handled, members can regroup to complete any remaining task or the original purpose of the outing.",
        ],
        example: {
          label: "Sample plan outline (illustrative situation)",
          text: "Situation (invented for practice): Time 1400 hrs. Six friends with one motorcycle (40 km/h) and a jeep (40 km/h, 6 seats) are at a picnic spot. They notice (a) a bomb-like object on the railway bridge 4 km away, with a passenger train due at 1500 hrs; (b) a villager injured in a fall, 2 km away, hospital 12 km away; (c) a forest fire starting near a village 6 km away. Priorities: 1. Railway bomb – many lives, fixed deadline. 2. Injured villager – one life, needs care soon. 3. Forest fire – serious, villagers can be alerted to help. Plan: At 1400, A and B take the motorcycle to the bridge (6 min), arriving 1406. A waves a red cloth and stops the train well before the bridge; B rides to the station 3 km on to inform the station master and police (5 min, 1411). C, D and E take the jeep to the injured man (3 min), give first aid, and drive him to the hospital (18 min), arriving about 1425; C informs the fire station from the hospital phone. F walks to the nearby village (15 min) to alert villagers, who begin beating out the fire edge and clearing dry leaves until the fire brigade arrives. By 1530 all regroup at the picnic spot.",
        },
      },
      {
        id: "writing-the-plan",
        heading: "Writing the individual plan",
        paragraphs: [
          "In the limited writing time, a clear structure helps: a line on the situation as you understood it, your priorities with reasons, then the action for each person or sub-group with times, and a closing line on how the group regroups. Short sentences and timings in a consistent format make the plan easy to follow.",
          "Do not spend too long on perfect handwriting or on a minor problem. A complete, sensible plan with reasonable timings is better than a detailed plan for only one problem.",
        ],
        bullets: [
          "Situation: one or two lines.",
          "Priorities: numbered, with a short reason each.",
          "Actions: who does what, how they travel, and at what time.",
          "Communication: whom you inform and how.",
          "Regrouping: what happens after the problems are handled.",
        ],
      },
      {
        id: "group-discussion-stage",
        heading: "The group discussion and presentation",
        paragraphs: [
          "In the group discussion, the aim is to arrive at one common plan. Offer your plan's key ideas briefly, listen to others, and be ready to change your priorities if someone gives a better reason. Insisting on your own plan regardless of merit does not help the group.",
          "Help the group move forward: suggest settling priorities first, then allocation, then timings. If you are asked to present the common plan, present the group's agreed plan clearly, even if it differs from your own.",
        ],
      },
    ],
    exercises: [
      {
        title: "Build your own GPE",
        instructions: "Draw a simple map with a village, a road, a river, a railway line and a hospital. Write a scenario with three simultaneous problems, resources and distances. Swap with a friend, solve each other's scenario in ten minutes, and compare priorities and timings.",
      },
      {
        title: "Timing calculations",
        instructions: "Write ten quick problems such as '7 km at 35 km/h' and calculate travel times in minutes. Repeat until you can do each in under 15 seconds without a calculator.",
      },
      {
        title: "Ten-minute written plan",
        instructions: "Use the sample situation in this article. Without looking at the sample plan, write your own plan in ten minutes using the five-part structure. Then compare and note any differences in priorities or timings.",
      },
    ],
    takeaways: [
      "Listen carefully to the narrative and note every resource, distance and time.",
      "Prioritise saving life, then preventing large-scale damage, with clear reasons.",
      "Split the group to handle problems in parallel and use realistic timings.",
      "Write a complete, structured plan rather than a perfect partial one.",
      "In the group stage, work towards one common plan and accept better ideas.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. Lecturette
  // ---------------------------------------------------------------------------
  {
    slug: "lecturette-preparation",
    title: "Lecturette preparation and a topic practice list",
    category: "Group Tasks",
    description: "How to choose a topic, prepare in three minutes and speak clearly, with 24 practice topics.",
    updatedOn: "2026-10-25",
    objectives: [
      "Understand the lecturette format: topic selection, short preparation and a timed talk.",
      "Use a simple three-part structure to organise any topic quickly.",
      "Improve delivery: voice, pace, eye contact and time management.",
      "Practise with a varied list of topics across common categories.",
    ],
    sections: [
      {
        id: "format",
        heading: "The format",
        paragraphs: [
          "In the lecturette, each candidate speaks to the group on a topic for about three minutes. Candidates usually pick a card with several topics of varying difficulty and choose one. A short preparation time, often about three minutes, is given while the previous candidate speaks. The GTO and the group listen; there may be no questions afterwards.",
          "The lecturette is a chance to show how you organise thoughts and express them. You are not expected to be an expert. A clear, well-structured talk on a familiar topic is better than a confused attempt at a difficult one.",
        ],
      },
      {
        id: "choosing-a-topic",
        heading: "Choosing a topic",
        paragraphs: [
          "Choose the topic on which you can say the most sensible things, not the one that sounds most impressive. If you have read about a subject recently, have a personal connection with it, or can easily think of three points, it is a good choice.",
          "Decide within the first few seconds. Spending a minute deciding leaves only two minutes to prepare.",
        ],
      },
      {
        id: "three-part-structure",
        heading: "A three-part structure for any topic",
        paragraphs: [
          "A simple and reliable structure is: introduction, body and conclusion. The introduction defines the topic and explains why it matters. The body covers two or three main points, each with an example or fact. The conclusion summarises and gives your view or a way forward.",
          "During preparation, jot down only key words for each part on the small paper you are given, if writing is allowed. Do not write sentences; key words are faster to read and keep your talk natural.",
        ],
        example: {
          label: "Lecturette outline: 'Cleanliness drives in Indian cities'",
          text: "Introduction (30 sec): what cleanliness drives are; why sanitation matters for health and dignity. Body point 1 (40 sec): public campaigns and their effect on awareness – many cities now have door-to-door waste collection. Body point 2 (40 sec): challenges – waste segregation at source, landfill overflow, behaviour change. Body point 3 (40 sec): role of citizens and youth – segregating waste at home, local clean-up drives, not littering. Conclusion (30 sec): cleanliness is a habit before it is a campaign; government provides systems, citizens make them work.",
        },
      },
      {
        id: "delivery",
        heading: "Delivery: voice, pace and eye contact",
        paragraphs: [
          "Stand straight with feet slightly apart, and hands relaxed or holding your paper. Greet the audience briefly, state your topic and begin. Speak loud enough for the back of the room and at a steady pace. Look around the whole group, not just at the GTO or at your paper.",
          "Short pauses between points help listeners follow you and help you collect thoughts. If you lose your thread, glance at your key words, pause briefly and continue. Do not apologise or stop.",
        ],
        bullets: [
          "Greet, state the topic, and begin within a few seconds.",
          "Use signposts: 'firstly', 'secondly', 'to conclude'.",
          "Look at the whole group, not only at your notes.",
          "Avoid fillers such as 'basically' and 'you know'.",
          "Finish within time with a clear concluding sentence.",
        ],
      },
      {
        id: "time-management",
        heading: "Managing three minutes",
        paragraphs: [
          "Three minutes passes quickly. A rough split is thirty seconds for the introduction, about two minutes for the body, and thirty seconds for the conclusion. Practice with a timer until you can sense the passage of time without looking at a watch.",
          "If a bell or signal indicates time, conclude promptly in one or two sentences. Running far over time or ending abruptly mid-point both suggest weak planning.",
        ],
      },
      {
        id: "practice-topics",
        heading: "Practice topic list",
        paragraphs: [
          "Use the list below for regular practice. It covers categories commonly seen in lecturettes. Rotate through categories so you are not caught out by an unfamiliar area.",
        ],
        bullets: [
          "Social: Role of women in nation building.",
          "Social: Importance of sports in schools.",
          "Social: Road safety in India.",
          "Social: Influence of social media on youth.",
          "Social: Value of volunteering.",
          "Education: Online learning – benefits and limits.",
          "Education: Vocational training for youth.",
          "Education: Importance of reading habits.",
          "Science and technology: Artificial intelligence in daily life.",
          "Science and technology: India's space programme.",
          "Science and technology: Cyber security for ordinary citizens.",
          "Science and technology: Digital payments in India.",
          "Environment: Water conservation.",
          "Environment: Plastic pollution and alternatives.",
          "Environment: Renewable energy in India.",
          "Environment: Climate change and agriculture.",
          "Defence and security: Role of the armed forces in disaster relief.",
          "Defence and security: Self-reliance in defence manufacturing.",
          "Defence and security: The importance of the NCC.",
          "Economy: Startups and entrepreneurship among youth.",
          "Economy: Tourism as an economic driver.",
          "General: A person who inspires me.",
          "General: Leadership lessons from sports.",
          "General: My hometown.",
        ],
      },
    ],
    exercises: [
      {
        title: "Three-minute practice",
        instructions: "Pick a random topic from the list, prepare for three minutes using key words only, and speak for three minutes while recording on your phone. Watch the recording and note pace, fillers and eye contact.",
      },
      {
        title: "Topic card drill",
        instructions: "Write four topics of varying difficulty on a card. Give yourself ten seconds to choose and three minutes to prepare. Repeat with a new card daily for two weeks.",
      },
      {
        title: "Group lecturette session",
        instructions: "With friends, take turns giving lecturettes. Each listener notes one strength and one area to improve for the speaker, focusing on structure and delivery.",
      },
    ],
    takeaways: [
      "Choose the topic you can speak on most sensibly, and decide quickly.",
      "Use introduction, two or three body points with examples, and a conclusion.",
      "Write key words, not sentences, during preparation.",
      "Speak clearly, steadily and to the whole group.",
      "Practise with a timer until three minutes feels natural.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 8. Individual obstacles, command task and final group task
  // ---------------------------------------------------------------------------
  {
    slug: "obstacles-and-command-task",
    title: "Individual obstacles, command task and final group task",
    category: "Group Tasks",
    description: "Prepare for the individual obstacles, lead a command task and contribute to the final group task.",
    updatedOn: "2026-10-25",
    objectives: [
      "Understand the format of the Individual Obstacles and plan an efficient sequence.",
      "Build the fitness and confidence needed to attempt obstacles safely.",
      "Lead a command task: brief the team, plan, adapt and stay calm.",
      "Contribute effectively as a subordinate and in the final group task.",
    ],
    sections: [
      {
        id: "individual-obstacles",
        heading: "Individual Obstacles: the format",
        paragraphs: [
          "In the Individual Obstacles, each candidate attempts a series of ten obstacles alone in about three minutes. The obstacles are numbered, typically from 1 to 10, with higher numbers carrying more points. Common types include a single ramp, a double barrel, a balancing beam, a screen jump, a burma bridge, a tarzan swing, a monkey rope, a commando walk, a tiger leap and a rope climb. The exact set varies.",
          "The GTO demonstrates each obstacle and explains its rules first. You may usually start at any obstacle and attempt them in any order, and some may be repeated after completing the set. A whistle marks the start and end.",
        ],
      },
      {
        id: "planning-your-sequence",
        heading: "Planning your sequence",
        paragraphs: [
          "Before your turn, look at the layout and plan a route that minimises running between obstacles and keeps your energy for the most important ones. Many candidates start with an obstacle they find easy to build momentum, then move through the set in a logical circle.",
          "If you fail an obstacle, do not freeze or argue. Either re-attempt it once if time allows, or move straight to the next one. Hesitation costs more time than a missed attempt.",
        ],
        example: {
          label: "Planning a route (illustrative layout)",
          text: "Layout: obstacles 1 to 10 arranged roughly in a circle, with the rope climb (10) next to the single ramp (1). Plan: start at 1 to warm up, move clockwise 2, 3, 4, 5 and so on, finish with 10 (rope climb) when still fresh enough to attempt it, and, if time remains, repeat 6 and 7 which are close together. Running distance is minimal and no obstacle is skipped by design.",
        },
      },
      {
        id: "fitness-and-safety",
        heading: "Fitness and safety",
        paragraphs: [
          "Obstacles require basic fitness: running endurance, upper body strength for rope work, leg strength for jumps, and balance. A few weeks of regular training makes a significant difference. Focus on running, push-ups, pull-ups or hanging, squats, skipping and balance exercises.",
          "Safety comes first. Jump only as instructed, land with bent knees, and do not attempt an obstacle in a way that risks injury. An injury early in the GTO series affects all remaining tasks.",
        ],
        bullets: [
          "Run 3 to 5 km three or four times a week.",
          "Build upper body strength with push-ups and hanging or pull-ups.",
          "Practise rope climbing where a safe rope and supervision are available.",
          "Do skipping, squats and lunges for leg strength.",
          "Practise balance on a low beam or kerb.",
        ],
      },
      {
        id: "command-task",
        heading: "The Command Task",
        paragraphs: [
          "In the command task, each candidate is the commander for one obstacle, with a small team chosen from the group as subordinates. The GTO explains the task and rules, and you may sometimes be asked to choose your subordinates. The task resembles a smaller PGT: crossing an obstacle with helping material.",
          "As commander, take a moment to study the obstacle and plan. Brief your team clearly: the aim, the rules and the plan. Then direct the execution, help physically where useful and adapt if the plan fails. Calmness and clear instructions matter more than speed.",
        ],
        example: {
          label: "A clear command briefing",
          text: "'Team, our task is to cross from this drum to that platform with the load, without touching the red areas. Plan: Amit and I lay the plank from the drum to the pole; Sunil ties the rope to the pole for support; we pass the load across, then everyone crosses one by one with Amit last. Any questions? Let us start.'",
        },
      },
      {
        id: "as-a-subordinate",
        heading: "As a subordinate",
        paragraphs: [
          "You will also act as a subordinate in other candidates' command tasks. Follow the commander's instructions willingly and work hard. If you notice a rule violation or a better idea, suggest it politely without taking over.",
          "Being a good team member is as much a part of leadership development as giving orders.",
        ],
      },
      {
        id: "final-group-task",
        heading: "The Final Group Task",
        paragraphs: [
          "The Final Group Task is generally the last outdoor task, similar to the PGT, for the whole group. It is often a single obstacle with helping material and rules.",
          "By this point, the group knows each other well. Use that familiarity to cooperate efficiently: share ideas, help each other and carry the plan through. Continue to follow rules carefully even when tired.",
        ],
      },
    ],
    exercises: [
      {
        title: "Four-week fitness block",
        instructions: "For four weeks, train five days a week: run 3 to 5 km on three days and do strength work (push-ups, hanging, squats, skipping) on two days. Record your timings and repetitions weekly.",
      },
      {
        title: "Mock obstacle circuit",
        instructions: "In a safe open space, set up ten simple stations (jumping over a low bar, balancing on a beam, crawling, skipping). Plan a route, then complete as many as possible in three minutes. Repeat and try to improve your sequence.",
      },
      {
        title: "Command briefing practice",
        instructions: "With two or three friends, set a small problem using a plank and a rope. Take turns as commander: study for one minute, brief the team in under 45 seconds, then lead. Each subordinate gives feedback on the clarity of the briefing.",
      },
    ],
    takeaways: [
      "Plan your obstacle route before your turn and keep moving after a failed attempt.",
      "Build basic fitness and prioritise safety to stay fit for the whole series.",
      "As commander, study, brief clearly, lead execution and adapt calmly.",
      "As a subordinate, follow willingly and suggest improvements politely.",
      "In the final group task, cooperate fully and keep following the rules.",
    ],
  },
];
