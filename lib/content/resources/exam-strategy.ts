// Exam Guidance, Current Affairs and Tips & Strategies articles for the
// Student Resources library. Editorial content written for EliteCadet.
// Exam facts here describe only long-standing, widely published structure;
// every article sends the reader to the current official notification for
// anything time-sensitive (dates, age limits, vacancies, cut-offs).

import type { ResourceArticle } from "@/types/resources";

const UPDATED_ON = "2026-10-25";

const UPSC_ACTIVE_EXAMS = {
  label: "UPSC — Active examinations",
  url: "https://upsc.gov.in/examinations/active-exams",
};
const UPSC_WHATS_NEW = { label: "UPSC — What's New", url: "https://upsc.gov.in/whats-new" };
const JOIN_ARMY = { label: "Join Indian Army (official)", url: "https://joinindianarmy.nic.in" };
const JOIN_NAVY = { label: "Join Indian Navy (official)", url: "https://www.joinindiannavy.gov.in" };
const AFCAT = { label: "AFCAT (Indian Air Force, official)", url: "https://afcat.cdac.in" };
const PIB = { label: "Press Information Bureau", url: "https://pib.gov.in" };
const MOD = { label: "Ministry of Defence", url: "https://mod.gov.in" };

export const EXAM_STRATEGY_RESOURCES: ResourceArticle[] = [
  // ---------------------------------------------------------------- Exam Guidance
  {
    slug: "nda-preparation-roadmap",
    title: "NDA preparation roadmap",
    category: "Exam Guidance",
    description:
      "A phase-by-phase plan for the NDA written exam and the SSB interview that follows it.",
    updatedOn: UPDATED_ON,
    featured: false,
    objectives: [
      "Understand the long-standing structure of the NDA & NA examination and where to confirm the current details.",
      "Build a realistic phase-wise plan that balances Mathematics, English and General Knowledge.",
      "Use mock tests and error logs to improve steadily rather than by guesswork.",
      "Start SSB preparation early instead of treating it as an afterthought to the written exam.",
    ],
    sections: [
      {
        id: "exam-structure",
        heading: "How the NDA examination is structured",
        paragraphs: [
          "The National Defence Academy and Naval Academy (NDA & NA) examination is conducted by the Union Public Service Commission (UPSC), usually twice a year. For many years the written examination has had two papers: Mathematics for 300 marks and the General Ability Test (GAT) for 600 marks. The GAT is divided into English (200 marks) and General Knowledge (400 marks). Each paper has a duration of two and a half hours.",
          "Candidates who qualify in the written examination are called for the SSB interview, which carries 900 marks. The final merit list combines the written and SSB marks, subject to medical fitness. This means the written exam gets you to the SSB, but the SSB carries a very large share of the final result.",
          "Exam rules can change. Eligibility, age limits, educational qualifications, the branches open to each gender, negative marking rules, exam dates and the number of vacancies are all published in the official notification for each cycle. Always read the current notification on the UPSC website before you plan, and treat any coaching material or social media post as secondary to it.",
        ],
        bullets: [
          "Paper I — Mathematics: 300 marks, 2.5 hours.",
          "Paper II — General Ability Test: 600 marks (English 200, General Knowledge 400), 2.5 hours.",
          "SSB interview: 900 marks, for those who qualify in the written exam.",
          "Confirm every detail in the current UPSC notification.",
        ],
      },
      {
        id: "phase-plan",
        heading: "A three-phase preparation plan",
        paragraphs: [
          "Phase one is foundation. Most NDA Mathematics and much of the General Knowledge section are built on school-level NCERT content in Mathematics, Physics, Chemistry, Biology, History, Geography and Polity. Spend this phase reading NCERT books properly, making short notes and solving basic exercises. Do not jump to advanced shortcut books before your concepts are clear.",
          "Phase two is practice. Shift towards topic-wise question sets and previous years' papers, which UPSC publishes on its website. Start timing yourself. Keep a simple error log: every question you got wrong, why you got it wrong (concept gap, calculation slip, misreading, guess), and what you will do differently.",
          "Phase three is full-length mocks and revision. Attempt complete papers in the actual time limit, analyse them the same day, and revise from your own notes and error log rather than starting new books. If you are a Class 12 student, align this phase with your board exam schedule so that neither suffers.",
        ],
        example: {
          label: "Sample weekly timetable (school student, phase two)",
          text: "Monday to Friday, after school: 75 minutes Mathematics (one topic, theory recap plus 25 questions), 30 minutes English (one reading passage plus 20 vocabulary or grammar questions), 30 minutes General Knowledge (one NCERT chapter or 15 minutes of newspaper notes plus 15 minutes of static GK). Saturday: one sectional test and its analysis. Sunday morning: revision of the week's notes and error log; Sunday evening: rest, sport or a hobby.",
        },
      },
      {
        id: "subject-approach",
        heading: "Subject-wise approach",
        paragraphs: [
          "Mathematics rewards accuracy more than speed in the early stages. Learn the standard topics thoroughly — algebra, trigonometry, matrices and determinants, analytical geometry, calculus, vectors, statistics and probability, as listed in the official syllabus — and only then work on speed. Read the negative marking rule in the notification and decide in advance how you will handle questions you are unsure about.",
          "English in the GAT tests reading comprehension, vocabulary, grammar and usage. Reading a quality newspaper editorial daily and noting unfamiliar words in context is more useful than memorising long word lists. Practise spotting errors and completing sentences regularly.",
          "General Knowledge is the largest section by marks. Cover the static subjects through NCERT books, and follow current affairs through official and reliable sources. Keep your notes short so that you can revise them many times.",
        ],
      },
      {
        id: "ssb-early",
        heading: "Start SSB preparation alongside the written exam",
        paragraphs: [
          "Many candidates clear the written exam and then have only a few weeks before their SSB. Qualities assessed at the SSB — clear thinking, expression, cooperation, initiative and responsibility — develop through habits over months, not through last-minute coaching.",
          "Small daily habits help: speak in English for a few minutes on a topic, take part in sports or team activities, read about the armed forces, and reflect honestly on your strengths and weaknesses. Fill in a practice PIQ form so that you know your own background facts precisely.",
        ],
        bullets: [
          "Practise a few WAT words or SRT situations each week on the app.",
          "Join a team sport or activity and take responsibility in it.",
          "Read about the three services and their training academies.",
        ],
      },
      {
        id: "health-and-routine",
        heading: "Fitness and routine",
        paragraphs: [
          "Physical fitness matters at the SSB group tasks and for training afterwards. A daily routine of running, basic strength work and adequate sleep also improves concentration while studying.",
          "Check the medical standards published on the official recruitment websites early, especially for eyesight and other conditions that may need attention, so that you are not surprised later.",
        ],
      },
    ],
    exercises: [
      {
        title: "Read the notification",
        instructions:
          "Open the latest NDA & NA notification on the UPSC website. Write down, in your own words, the eligibility conditions, the scheme of examination and the important dates. Note anything that differs from what you expected.",
      },
      {
        title: "Diagnostic paper",
        instructions:
          "Attempt one previous year's Mathematics paper under timed conditions. Classify every wrong or skipped question by topic and reason, and use the result to decide which three topics you will strengthen first.",
      },
      {
        title: "Build your weekly timetable",
        instructions:
          "Using the sample timetable as a model, write a timetable that fits your school or college hours. Follow it for one week and then adjust it honestly based on what you actually managed.",
      },
    ],
    takeaways: [
      "The NDA written exam has Mathematics (300) and GAT (600); the SSB carries 900 marks.",
      "Always confirm dates, eligibility and rules in the current UPSC notification.",
      "Build NCERT foundations before moving to timed practice and full mocks.",
      "An error log turns every mock test into a lesson.",
      "Begin SSB-related habits alongside written preparation, not after it.",
    ],
    officialLinks: [UPSC_ACTIVE_EXAMS],
  },
  {
    slug: "cds-exam-preparation-strategy",
    title: "CDS exam preparation strategy",
    category: "Exam Guidance",
    description:
      "How to prepare for the CDS papers as a graduate or final-year student, including the OTA route.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Know the long-standing paper pattern for the IMA, INA, AFA and OTA routes of the CDS exam.",
      "Choose your preferences thoughtfully and confirm eligibility in the official notification.",
      "Plan preparation around a job or college schedule.",
      "Use previous papers and mock analysis efficiently.",
    ],
    sections: [
      {
        id: "cds-structure",
        heading: "How the CDS examination is structured",
        paragraphs: [
          "The Combined Defence Services (CDS) examination is conducted by UPSC, usually twice a year, for entry to the Indian Military Academy (IMA), the Indian Naval Academy (INA), the Air Force Academy (AFA) and the Officers' Training Academy (OTA).",
          "For candidates applying to IMA, INA or AFA, the written exam has traditionally had three papers — English, General Knowledge and Elementary Mathematics — each of 100 marks and two hours. Candidates applying only for OTA write English and General Knowledge, without the Mathematics paper. Qualified candidates then appear for the SSB interview.",
          "Educational qualifications differ by academy (for example, some entries require particular subjects at graduation), and age limits, marital status rules, vacancies and whether final-year students can apply are defined in each notification. Read the current UPSC notification carefully before choosing your preferences.",
        ],
        bullets: [
          "IMA / INA / AFA: English, General Knowledge, Elementary Mathematics — 100 marks each, 2 hours each.",
          "OTA: English and General Knowledge only.",
          "Eligibility and preferences differ by academy — confirm in the notification.",
        ],
      },
      {
        id: "choosing-preferences",
        heading: "Choosing your preferences",
        paragraphs: [
          "The application asks you to order the academies you are eligible for. Think about the kind of career and service you genuinely want, the commission type each academy leads to, and your eligibility. The official recruitment websites of the Army, Navy and Air Force describe the training and career paths.",
          "Your preference order also comes up at the SSB. Interviewers may ask why you chose a particular service or entry, so be ready to explain your choice with honest, specific reasons.",
        ],
      },
      {
        id: "paper-strategy",
        heading: "Paper-wise strategy",
        paragraphs: [
          "English is common to every route and is often underestimated. Practise reading comprehension, synonyms and antonyms in context, sentence improvement and spotting errors. Read one editorial a day and summarise it in three sentences.",
          "General Knowledge covers History, Geography, Polity, Economy, General Science and current affairs. School-level NCERT books are a strong base. Keep current affairs notes in a fixed format and revise them weekly.",
          "Elementary Mathematics covers arithmetic, algebra, trigonometry, geometry, mensuration and statistics at roughly school level. Graduates who have been away from Mathematics for some years should start with basics and rebuild speed gradually. Read the negative marking rule in the notification and practise deciding when to skip.",
        ],
      },
      {
        id: "working-candidates",
        heading: "Preparing alongside a job or college",
        paragraphs: [
          "Many CDS aspirants are final-year students or working graduates. Consistency matters more than long hours. Ninety focused minutes on weekdays and longer sessions at weekends, sustained for months, can cover the syllabus.",
          "Protect a fixed daily slot and use small gaps (commutes, breaks) for vocabulary or current affairs revision on your phone.",
        ],
        example: {
          label: "Sample weekly plan for a working graduate",
          text: "Weekdays 6:00 to 7:30 am: Monday and Thursday Mathematics, Tuesday and Friday English, Wednesday General Knowledge (static). Lunch break: 15 minutes current affairs notes. Saturday: one full paper (rotate English, GK, Maths) and analysis. Sunday: revise error log and weekly current affairs, then a long run or sport.",
        },
      },
      {
        id: "mocks-and-analysis",
        heading: "Mocks and analysis",
        paragraphs: [
          "Previous years' question papers are available on the UPSC website. Solve them under exam timing, then spend at least as long analysing as you did attempting. Note repeated topic areas and your recurring mistakes.",
          "Track your attempts and accuracy per paper over time. A rise in accuracy is a better sign of progress than a rise in the number of questions attempted.",
        ],
      },
      {
        id: "beyond-written",
        heading: "Preparing for the SSB as a CDS candidate",
        paragraphs: [
          "CDS candidates are usually older than NDA candidates and interviewers expect more maturity: clearer views on current affairs, awareness of your own work or college responsibilities, and a considered reason for choosing the forces.",
          "Prepare to speak about your academic subjects, your job role if you work, and what you have learned from them. Keep your practice PIQ form accurate and consistent with what you say.",
          "If you have attempted the exam or the SSB before, be ready to discuss what you learned and what you changed since then. Interviewers generally respond well to honest reflection and visible effort, and poorly to blaming circumstances or other people.",
        ],
      },
      {
        id: "common-pitfalls",
        heading: "Common pitfalls for CDS aspirants",
        paragraphs: [
          "Graduates sometimes assume that school-level Mathematics will be easy and leave it until late. In practice, speed and accuracy fade after a few years away from the subject, so begin early with basic arithmetic and algebra and practise steadily.",
          "Another frequent mistake is collecting too many books and online courses. One good source per subject, the official syllabus, previous papers and your own notes are usually enough. Switching resources every few weeks wastes time and creates the feeling of never finishing.",
          "Finally, some candidates neglect fitness and expression while preparing for the written exam. A daily run and a few minutes of spoken English cost little time and pay off at the SSB.",
        ],
        bullets: [
          "Start Mathematics early if you have been away from it.",
          "Limit yourself to one main source per subject.",
          "Keep fitness and speaking practice going throughout.",
        ],
      },
    ],
    exercises: [
      {
        title: "Eligibility check",
        instructions:
          "From the current CDS notification, list each academy, its educational requirement and whether you are eligible. Write two honest reasons for your first preference.",
      },
      {
        title: "Timed English paper",
        instructions:
          "Attempt one previous year's English paper in two hours. Categorise mistakes as vocabulary, grammar, comprehension or careless, and pick one category to focus on for the next two weeks.",
      },
      {
        title: "Weekly schedule trial",
        instructions:
          "Write a weekly plan that fits your real routine. Follow it for two weeks and record which sessions you missed and why. Adjust the plan rather than abandoning it.",
      },
    ],
    takeaways: [
      "IMA/INA/AFA candidates write English, GK and Elementary Mathematics; OTA candidates write English and GK.",
      "Eligibility and preferences vary by academy — read the current UPSC notification.",
      "Short, consistent daily study works well for students and working graduates.",
      "Analyse previous papers as carefully as you attempt them.",
    ],
    officialLinks: [UPSC_ACTIVE_EXAMS],
  },
  {
    slug: "official-notifications-guide",
    title: "Reading official notifications: NDA, CDS and AFCAT",
    category: "Exam Guidance",
    description:
      "Where official exam notifications are published and how to read them carefully before you apply.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Know which body conducts NDA, CDS and AFCAT and where each publishes its notification.",
      "Read a notification section by section and extract what matters to you.",
      "Avoid common application mistakes and misinformation.",
    ],
    sections: [
      {
        id: "who-conducts",
        heading: "Who conducts which exam",
        paragraphs: [
          "The NDA & NA examination and the CDS examination are conducted by the Union Public Service Commission (UPSC). Their notifications appear on the UPSC website, typically under active examinations and in the What's New section.",
          "The Air Force Common Admission Test (AFCAT) is conducted by the Indian Air Force itself, not by UPSC. Its notifications and online applications are handled through the official AFCAT website.",
          "The Army and Navy also run other entries that do not need a written UPSC exam. These are announced on their official recruitment websites. Check the official site for each entry rather than relying on forwarded messages.",
        ],
        bullets: [
          "NDA & NA — UPSC (upsc.gov.in).",
          "CDS — UPSC (upsc.gov.in).",
          "AFCAT — Indian Air Force (afcat.cdac.in).",
          "Other Army and Navy entries — joinindianarmy.nic.in and joinindiannavy.gov.in.",
        ],
      },
      {
        id: "anatomy",
        heading: "The parts of a notification",
        paragraphs: [
          "A notification is long, but it follows a predictable order. Read it fully once, then return to the parts that apply to you. Most mistakes happen because candidates skim it.",
          "Key parts usually include: important dates (application window, exam date, admit card release), vacancies by academy or branch, eligibility (nationality, age, educational qualification, marital status, gender-specific conditions), the scheme of examination and syllabus, physical and medical standards, instructions for filling the online application, and fees with any exemptions.",
        ],
        bullets: [
          "Important dates and the application window.",
          "Vacancies by academy, branch or course.",
          "Eligibility: age, education, nationality, marital status and other conditions.",
          "Scheme of examination, syllabus and marking rules.",
          "Medical and physical standards.",
          "Application procedure, documents and fees.",
        ],
      },
      {
        id: "reading-method",
        heading: "A careful reading method",
        paragraphs: [
          "Print or save the notification as a PDF. Highlight every date and every condition that applies to you. Where an age limit is defined by a range of birth dates, check your date of birth against it exactly as written, not by mental arithmetic.",
          "Write a one-page summary for yourself. If something is unclear, look for the corrigendum or helpline details published by the conducting body, rather than asking on social media.",
        ],
        example: {
          label: "Sample one-page notification summary",
          text: "Exam: (name and cycle as printed). Conducting body: UPSC. Application window: (from and to dates as printed). My eligibility: date of birth within the printed range — yes; qualification — final-year student, allowed with conditions on page X — yes. Papers I will write: (as per scheme). Negative marking: (as printed). Documents to keep ready: photo, signature, ID proof as specified. Next action: submit by (date), then download and save confirmation.",
        },
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes to avoid",
        paragraphs: [
          "Candidates lose opportunities through avoidable errors: waiting until the last day when the website is busy, uploading photographs in the wrong format, entering details that do not match their certificates, or relying on an unofficial site that copies notifications with errors.",
          "Keep your certificates and identity documents consistent with each other. The details you enter now will be checked later, including at the SSB and during document verification.",
        ],
        bullets: [
          "Apply early in the window, not on the last day.",
          "Match names and dates exactly to your certificates.",
          "Save the submitted form and payment confirmation.",
          "Use only official websites for notifications and applications.",
        ],
      },
      {
        id: "after-applying",
        heading: "After you apply",
        paragraphs: [
          "Watch the official website for admit cards, any change in exam centre or date, and results. After the written result, SSB call-up details are communicated through the channels the notification describes — usually the recruitment website of the service you selected.",
          "Set a reminder to check the official websites weekly during an active cycle. Use the app's Daily Current Affairs page for dated official releases, but treat the conducting body's website as final for exam matters.",
          "Keep a simple folder, physical or digital, for each exam cycle: the notification, your summary, the submitted application, the payment receipt, the admit card and any letters received. When you are asked for a document weeks later, you will find it in seconds.",
        ],
      },
      {
        id: "corrigenda-and-changes",
        heading: "Corrigenda, changes and official clarifications",
        paragraphs: [
          "Conducting bodies sometimes issue a corrigendum or addendum after the main notification — for example, to correct a date, revise vacancies or clarify an eligibility condition. These are published on the same official website and carry the same authority as the original notice.",
          "Make it a habit to look for any such notice before you apply, and again before the exam. If you saved the notification early in the cycle, compare it with the latest version on the website rather than assuming nothing has changed.",
          "When a rule is genuinely unclear to you, use the helpline or contact details printed in the notification. Coaching institutes and online groups can be helpful for study, but their interpretation of rules is not official and may be out of date.",
        ],
        bullets: [
          "Check the website for any corrigendum before applying and before the exam.",
          "Compare your saved copy with the current version.",
          "Use the official helpline for doubts about eligibility.",
        ],
      },
    ],
    exercises: [
      {
        title: "One-page summary",
        instructions:
          "Download the current notification for the exam you plan to write and produce a one-page summary in the format shown in the example. Ask a parent, teacher or friend to check your eligibility lines against the original.",
      },
      {
        title: "Spot the source",
        instructions:
          "Find any exam update you have seen on social media this month. Trace it to an official page. If you cannot find it on an official website, note that it is unverified and do not act on it.",
      },
    ],
    takeaways: [
      "NDA and CDS notifications come from UPSC; AFCAT notifications come from the Indian Air Force.",
      "Read the whole notification once, then summarise the parts that apply to you.",
      "Check eligibility against the exact printed wording and date ranges.",
      "Only official websites are reliable sources for exam information.",
    ],
    officialLinks: [UPSC_ACTIVE_EXAMS, UPSC_WHATS_NEW, AFCAT, JOIN_ARMY, JOIN_NAVY],
  },

  // ---------------------------------------------------------------- Current Affairs
  {
    slug: "defence-current-affairs-essentials",
    title: "Important defence current affairs: what to track and how",
    category: "Current Affairs",
    description:
      "A method for following defence current affairs from official sources and turning them into usable notes.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Identify reliable, official sources for defence current affairs.",
      "Know which categories of defence news are worth tracking for exams and the SSB.",
      "Build a compact note-making system that you can revise quickly.",
      "Read news critically and form balanced views for GD and interview.",
    ],
    sections: [
      {
        id: "why-it-matters",
        heading: "Why defence current affairs matter",
        paragraphs: [
          "General Knowledge papers in NDA, CDS and AFCAT include current affairs, and the SSB group discussion and personal interview often touch on national and defence matters. Interviewers are less interested in whether you remember every date than in whether you understand issues and can discuss them sensibly.",
          "The aim is awareness and understanding, not memorising headlines. A candidate who can explain why an issue matters and give a balanced view is better prepared than one who can only recite facts.",
        ],
      },
      {
        id: "official-sources",
        heading: "Start with official sources",
        paragraphs: [
          "The Press Information Bureau (PIB) publishes official releases from every ministry, including the Ministry of Defence. These cover exercises, inductions, appointments, policy decisions and ceremonies, written in a factual style. The Ministry of Defence website and the official websites of the three services are also primary sources.",
          "The app's Daily Current Affairs page lists dated official releases so that you can see what was announced and when. Use it as a starting point and read the original release when a topic is important.",
          "For exam announcements, UPSC and the official recruitment websites are the only authoritative sources.",
        ],
        bullets: [
          "PIB releases from the Ministry of Defence.",
          "Ministry of Defence website.",
          "Official websites of the Army, Navy and Air Force.",
          "UPSC and AFCAT websites for exam matters.",
        ],
      },
      {
        id: "what-to-track",
        heading: "What to track",
        paragraphs: [
          "Defence news falls into a few recurring categories. Sorting news into these categories helps you see patterns instead of isolated events.",
        ],
        bullets: [
          "Joint exercises with other countries — name, participants, service involved, broad purpose.",
          "Indigenisation and defence production — platforms, policy steps, the role of domestic industry.",
          "Inductions and commissioning of ships, aircraft and equipment.",
          "Senior appointments such as service chiefs and the Chief of Defence Staff.",
          "Policy and organisational reforms in the Ministry of Defence and the services.",
          "Humanitarian assistance and disaster relief operations by the armed forces.",
          "Maritime security and India's role in the Indian Ocean Region.",
        ],
      },
      {
        id: "note-format",
        heading: "A note format you can revise",
        paragraphs: [
          "Long notes are rarely revised. Use a fixed, short format for every entry, and keep one notebook or digital file per category. Revise the week's entries every Sunday and the month's entries at month-end.",
          "Always record the date and source. If you cannot trace an item to a reliable source, do not add it to your notes.",
        ],
        example: {
          label: "Sample note format",
          text: "Date: (as on the release). Source: PIB, Ministry of Defence. Category: Joint exercise. What: bilateral naval exercise (name as in release) between India and (country). Where and who: (location, ships or units as stated). Why it matters: builds interoperability and maritime cooperation in the Indian Ocean Region. Possible question: What is the value of joint exercises for India? My view in one line: useful for cooperation and learning, while India keeps its own strategic choices.",
        },
      },
      {
        id: "critical-reading",
        heading: "Reading newspapers critically",
        paragraphs: [
          "Newspapers add analysis and context that official releases do not. Read at least one reputable national newspaper, focusing on the national, international and editorial pages. Separate facts (what happened, who announced it) from opinion (what a columnist thinks about it).",
          "When two sources disagree, note both views and check the official release. Avoid forming opinions from social media clips, unverified forwards or sensational headlines.",
        ],
      },
      {
        id: "using-it-at-ssb",
        heading: "Using current affairs at the SSB",
        paragraphs: [
          "In a group discussion, current affairs knowledge helps you add specific, relevant points. Use facts to support an argument, not to show off. In the interview, be honest if you do not know something; a calm 'I have not read about that, sir' is better than guessing.",
          "Prepare a short, balanced view on major recurring themes — for example, indigenisation, maritime security and the role of the armed forces in disaster relief — that you can explain in two or three sentences.",
          "Be careful with sensitive topics. Avoid strong statements about other countries, political parties or communities, and do not speculate about operational details. A measured tone shows maturity, which is itself something assessors notice.",
        ],
      },
      {
        id: "weekly-routine",
        heading: "A realistic weekly routine",
        paragraphs: [
          "Current affairs preparation fails most often because it is irregular: intense reading for a week, then nothing for a month. A modest, fixed routine is far more effective and leaves time for your other subjects.",
          "Twenty to thirty minutes a day is enough for most candidates if the time is used well. Read the official releases first, then one newspaper's national and editorial pages, and finish by writing one or two notes. Use the weekend for revision and a short self-test.",
        ],
        example: {
          label: "Sample weekly current affairs routine",
          text: "Monday to Friday: 10 minutes on PIB Ministry of Defence releases or the app's Daily Current Affairs page, 15 minutes on one newspaper's national and editorial pages, 5 minutes writing notes in the fixed format. Saturday: 20 minutes revising the week's notes by category. Sunday: write five questions from your notes and answer them without looking; speak for two minutes on the most important theme of the week.",
        },
      },
    ],
    exercises: [
      {
        title: "Seven-day source habit",
        instructions:
          "For seven days, read the Ministry of Defence releases on PIB (or the app's Daily Current Affairs page) and make at least one note per day in the sample format. At the end of the week, revise all notes in ten minutes.",
      },
      {
        title: "Fact or opinion",
        instructions:
          "Take one defence-related newspaper article. Underline factual statements in one colour and opinions in another. Write a two-line summary of the facts and a two-line summary of the author's opinion.",
      },
      {
        title: "Two-minute talk",
        instructions:
          "Pick one category from the tracking list and speak for two minutes on why it matters to India, using at least two items from your notes. Record yourself and check for clarity and balance.",
      },
    ],
    takeaways: [
      "Official sources — PIB, the Ministry of Defence and the services — come first.",
      "Track recurring categories rather than isolated headlines.",
      "Short, fixed-format notes with date and source are easy to revise.",
      "Separate facts from opinions and prepare balanced views for GD and interview.",
    ],
    officialLinks: [PIB, MOD],
  },
  {
    slug: "national-security-basics",
    title: "National security and defence basics every candidate should know",
    category: "Current Affairs",
    description:
      "Stable background on India's armed forces, training academies, ranks and key security concepts.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Describe the higher defence organisation, including the Chief of Defence Staff and the Department of Military Affairs.",
      "Recall the major pre-commission training institutions and equivalent ranks across the three services.",
      "Explain key concepts such as strategic autonomy, indigenisation and maritime security in the Indian Ocean Region.",
      "Form and express a balanced opinion on security topics in a GD or interview.",
    ],
    sections: [
      {
        id: "higher-defence-organisation",
        heading: "How India's defence is organised",
        paragraphs: [
          "The President of India is the Supreme Commander of the armed forces. Civilian control is exercised through the Union Government and the Ministry of Defence, headed by the Defence Minister. The armed forces consist of three services — the Indian Army, the Indian Navy and the Indian Air Force — each led by its own chief.",
          "In 2020 India created the post of Chief of Defence Staff (CDS) and a new Department of Military Affairs within the Ministry of Defence, headed by the CDS. The aim of these reforms is to improve jointness — the ability of the three services to plan, train and operate together — and to bring military expertise more directly into the Ministry.",
          "Organisational reforms continue to be discussed and implemented over time. When a question involves the current structure, check the Ministry of Defence website for the latest position.",
        ],
      },
      {
        id: "commands",
        heading: "Commands: a general overview",
        paragraphs: [
          "Each service is divided into commands, which are large formations responsible for a geographical area or a function such as training or maintenance. The Army and the Air Force have several operational commands along with training and support commands. The Navy has commands on the western and eastern seaboards and a training command.",
          "There are also tri-service commands. The Andaman and Nicobar Command, set up in 2001, brings the three services together under one commander in that region. The Strategic Forces Command manages India's strategic assets. Exact headquarters and the number of commands can change with reforms, so verify them on official websites before an exam.",
        ],
      },
      {
        id: "training-institutions",
        heading: "Major pre-commission training institutions",
        paragraphs: [
          "Knowing where officers are trained is basic awareness expected of every candidate, and interviewers sometimes ask why you prefer a particular academy.",
        ],
        bullets: [
          "National Defence Academy (NDA), Khadakwasla, near Pune — joint training for cadets of all three services.",
          "Indian Military Academy (IMA), Dehradun — trains officers for the Army.",
          "Indian Naval Academy (INA), Ezhimala, Kerala — trains officers for the Navy.",
          "Air Force Academy (AFA), Dundigal, near Hyderabad — trains officers for the Air Force.",
          "Officers' Training Academy (OTA), Chennai — trains officers for the Army, including short service commission entries.",
        ],
      },
      {
        id: "rank-equivalence",
        heading: "Rank equivalence basics",
        paragraphs: [
          "Commissioned ranks in the three services correspond to each other. Knowing the first few levels helps you read news and answer simple questions confidently.",
        ],
        example: {
          label: "Commissioned ranks (Army — Navy — Air Force)",
          text: "Lieutenant — Sub Lieutenant — Flying Officer. Captain — Lieutenant — Flight Lieutenant. Major — Lieutenant Commander — Squadron Leader. Lieutenant Colonel — Commander — Wing Commander. Colonel — Captain — Group Captain. Brigadier — Commodore — Air Commodore. Major General — Rear Admiral — Air Vice Marshal. Lieutenant General — Vice Admiral — Air Marshal. General — Admiral — Air Chief Marshal.",
        },
      },
      {
        id: "key-concepts",
        heading: "Key concepts in Indian security thinking",
        paragraphs: [
          "Strategic autonomy is the idea that India should make its own foreign and security decisions based on national interest, working with many partners without being bound to any single bloc.",
          "Indigenisation, promoted under the Atmanirbhar Bharat (self-reliant India) approach, aims to design and produce more defence equipment within the country. The Ministry of Defence has issued positive indigenisation lists of items to be sourced domestically. Benefits include supply security and industrial growth; challenges include technology gaps, timelines and cost.",
          "Maritime security in the Indian Ocean Region matters because a large share of India's trade and energy imports travels by sea. India's vision of Security and Growth for All in the Region (SAGAR), announced in 2015, emphasises cooperation with neighbours, capacity building and responding to disasters at sea.",
        ],
      },
      {
        id: "balanced-opinion",
        heading: "Forming a balanced opinion",
        paragraphs: [
          "In a GD or interview, a balanced opinion acknowledges more than one side, takes a clear position and supports it with reasons. Avoid extreme statements, emotional language and criticism of individuals or communities.",
          "A useful structure is: state the issue, give one or two benefits, give one or two challenges, and end with your considered view and a practical suggestion.",
        ],
        example: {
          label: "Sample balanced GD opinion on defence indigenisation",
          text: "Indigenisation is important because it reduces our dependence on imports during a crisis and builds domestic industry and jobs. At the same time, some advanced technologies take years to develop, and the forces cannot afford capability gaps meanwhile. So I feel the right approach is to make indigenisation the default wherever domestic capability exists, partner with foreign firms for technology transfer where it does not, and judge progress by quality and delivery, not only by percentages.",
        },
      },
    ],
    exercises: [
      {
        title: "Rank recall",
        instructions:
          "Write the nine Army ranks from Lieutenant to General from memory, then fill in the Navy and Air Force equivalents. Check against the example and repeat until you get all of them right.",
      },
      {
        title: "Academy map",
        instructions:
          "On a blank outline map of India, mark the NDA, IMA, INA, AFA and OTA locations. Write one line on which service each trains officers for.",
      },
      {
        title: "Balanced view practice",
        instructions:
          "Using the four-step structure, write a balanced opinion of about 80 words on maritime security in the Indian Ocean Region. Then speak it aloud in under one minute.",
      },
    ],
    takeaways: [
      "The President is Supreme Commander; the post of CDS and the Department of Military Affairs were created in 2020.",
      "NDA Khadakwasla, IMA Dehradun, INA Ezhimala, AFA Dundigal and OTA Chennai are the key training academies.",
      "Know rank equivalence across the three services.",
      "Strategic autonomy, indigenisation and Indian Ocean maritime security are recurring themes.",
      "A balanced opinion covers benefits, challenges and a clear, practical conclusion.",
    ],
    officialLinks: [MOD],
  },

  // ---------------------------------------------------------------- Tips & Strategies
  {
    slug: "staying-consistent-across-tests",
    title: "Staying consistent across every test",
    category: "Tips & Strategies",
    description:
      "Assessors compare your TAT, WAT, SRT, SDT and interview answers against each other.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Understand why the SSB uses several independent techniques to build one picture of a candidate.",
      "Recognise how inconsistency appears between written tests, group tasks and the interview.",
      "Build an honest self-understanding that naturally shows up the same way everywhere.",
    ],
    sections: [
      {
        id: "one-picture",
        heading: "Three techniques, one picture",
        paragraphs: [
          "At the SSB, you are assessed by the psychologist through written tests, by the Group Testing Officer through group tasks and by the interviewing officer through a personal interview. Each assessor forms an independent view, and the board later discusses them together at the conference.",
          "Because the views are formed separately, consistency matters. A candidate who writes about taking initiative in every TAT story but stays silent in every group task, or who describes himself as calm in the SDT but becomes defensive in the interview, presents a picture that does not fit together.",
        ],
      },
      {
        id: "where-inconsistency-shows",
        heading: "Where inconsistency shows up",
        paragraphs: [
          "Inconsistency is rarely about one answer. It appears as a pattern that differs between techniques.",
        ],
        bullets: [
          "PIQ facts versus interview answers — hobbies, achievements or responsibilities you cannot explain in detail.",
          "SDT claims versus behaviour — calling yourself a team player but interrupting others in the GD.",
          "TAT and SRT heroes versus your own life — stories full of bold action with no similar examples from your experience.",
          "WAT sentences versus interview attitudes — one set of values on paper and another in conversation.",
        ],
      },
      {
        id: "why-faking-fails",
        heading: "Why rehearsed answers do not help",
        paragraphs: [
          "Memorised 'ideal' responses tend to be similar across candidates and often do not match the person who wrote them. Under time pressure in WAT and SRT, and across four days of varied tasks, it is difficult to maintain a picture that is not genuine.",
          "The practical answer is not to perform a role, but to improve the real habits behind the qualities assessors look for, and then express yourself honestly.",
        ],
      },
      {
        id: "honest-self-assessment",
        heading: "Start with an honest self-assessment",
        paragraphs: [
          "Write down how your parents, teachers, friends and you yourself would describe you — the same questions the SDT asks. Include genuine strengths and one or two real areas you are working on.",
          "Then check each strength against evidence from your life. If you say you are organised, what have you actually organised? If you have no example, either find opportunities to build that quality or describe yourself more modestly.",
        ],
        example: {
          label: "Sample consistency check",
          text: "SDT claim: my friends think I take responsibility. Evidence: I coordinated our class trip and handled the budget. PIQ: listed as class representative. Interview readiness: can describe what went wrong on the trip and how I fixed it. Group task behaviour to practise: volunteer for a role, and listen before proposing a plan.",
        },
      },
      {
        id: "practise-consistently",
        heading: "Practise the same way you will be assessed",
        paragraphs: [
          "When you practise TAT, WAT and SRT on the app, review your responses together, not separately. Ask whether they show the same kind of person. Compare them with your SDT draft and your practice PIQ.",
          "Ask a friend or mentor who knows you to read a set of your responses and tell you whether they sound like you. Their reaction is often more useful than any score.",
          "When you use the app's AI-assisted feedback, treat it as a prompt for reflection rather than a verdict. Look for repeated observations across different tests — if several responses are flagged for the same pattern, that pattern is worth working on in real life.",
        ],
      },
      {
        id: "pressure-and-consistency",
        heading: "Staying yourself under pressure",
        paragraphs: [
          "Consistency is hardest when you are tired, nervous or surprised. During the SSB you will write many responses at speed, take part in group tasks with strangers and face questions you did not expect. Under that pressure, people tend to fall back on habits — which is exactly why genuine habits matter more than prepared lines.",
          "Practise under mild pressure before the SSB. Attempt WAT and SRT at realistic timings, take part in timed group discussions, and ask a mock interviewer to follow up on your answers with 'why' and 'give me an example'. Notice where your answers change from what you wrote earlier.",
          "If you realise during the SSB that you made a mistake or overstated something, it is acceptable to correct it honestly. A calm correction reads as maturity; defending an inaccurate claim usually makes the inconsistency worse.",
        ],
        bullets: [
          "Practise at realistic timings so habits, not scripts, carry you.",
          "Invite follow-up questions in mock interviews.",
          "Correct honest mistakes calmly instead of defending them.",
        ],
      },
    ],
    exercises: [
      {
        title: "Four-column check",
        instructions:
          "Make four columns: SDT claims, PIQ facts, recent practice responses and real-life examples. Fill each row for one quality, such as responsibility or cooperation. Circle any row where the columns do not match and decide on one real action to close the gap.",
      },
      {
        title: "Mentor read-through",
        instructions:
          "Share one complete practice set (TAT, WAT, SRT and SDT) with your mentor or a trusted friend and ask, 'Does this sound like me?' Note their comments and revise your self-assessment, not just your wording.",
      },
    ],
    takeaways: [
      "Psychologist, GTO and interviewing officer form independent views that are compared later.",
      "Inconsistency shows as a pattern across techniques, not a single answer.",
      "Rehearsed ideal answers rarely hold up across several days of testing.",
      "Build real habits and describe yourself honestly, with evidence.",
    ],
  },
  {
    slug: "officer-like-qualities",
    title: "Officer Like Qualities and practical self-improvement",
    category: "Tips & Strategies",
    description:
      "What the commonly described Officer Like Qualities mean and everyday ways to build them.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Know the commonly described Officer Like Qualities (OLQs) and how they are grouped.",
      "Understand what each group looks like in everyday behaviour.",
      "Choose practical, measurable activities to develop specific qualities.",
      "Track your own development honestly over weeks rather than days.",
    ],
    sections: [
      {
        id: "what-are-olqs",
        heading: "What Officer Like Qualities are",
        paragraphs: [
          "Officer Like Qualities is the widely used term for the traits the SSB looks for in a future officer. Preparation literature commonly lists fifteen qualities grouped into four factors. They are not a checklist to recite; they describe how a person thinks, relates to others, acts and persists.",
          "No candidate is expected to be perfect in every quality. The assessment looks at your overall potential and trainability — whether you have a sound base that training can develop.",
        ],
      },
      {
        id: "four-factors",
        heading: "The four commonly described factors",
        paragraphs: [
          "Understanding the grouping helps you see how everyday behaviour connects to these qualities.",
        ],
        bullets: [
          "Planning and organising: effective intelligence, reasoning ability, organising ability, power of expression.",
          "Social adjustment: social adaptability, cooperation, sense of responsibility.",
          "Social effectiveness: initiative, self-confidence, speed of decision, ability to influence the group, liveliness.",
          "Dynamic: determination, courage, stamina.",
        ],
      },
      {
        id: "everyday-behaviour",
        heading: "What these look like in daily life",
        paragraphs: [
          "Organising ability shows when you plan a college event and it runs on time. Cooperation shows when you support a teammate's idea that is better than yours. Initiative shows when you notice a problem in your hostel or society and do something about it without being asked. Determination shows when you keep training after a poor result.",
          "Assessors look for these qualities through your actions and the way you describe your life. That is why genuine experiences matter more than impressive-sounding words.",
        ],
      },
      {
        id: "practical-activities",
        heading: "Practical activities to build them",
        paragraphs: [
          "Choose activities that create real responsibility and interaction. Small, regular commitments work better than one large effort.",
        ],
        bullets: [
          "Expression: read aloud for ten minutes daily; speak for two minutes on a topic without notes.",
          "Organising: plan a small event or a weekly family task end to end, including a budget.",
          "Cooperation and responsibility: take a defined role in a team sport, NCC, NSS or a volunteer group.",
          "Initiative and decision-making: practise SRT situations and compare your response with what you actually did in similar real situations.",
          "Stamina and determination: follow a fitness plan with a measurable target, such as improving a timed run.",
        ],
      },
      {
        id: "tracking-progress",
        heading: "Tracking your development",
        paragraphs: [
          "Pick two or three qualities at a time. For each, choose one weekly action and one honest reflection question. Review progress every week and change focus after a month.",
          "Ask people who see you regularly for feedback. Their observations are more reliable than self-rating.",
        ],
        example: {
          label: "Sample four-week development log",
          text: "Quality: power of expression. Weekly action: speak for two minutes on a newspaper topic, three times a week, recorded on phone. Reflection question: did I make two clear points without long pauses? Week 1: lost track after the first point. Week 2: used a three-part structure, better. Week 3: spoke in a group discussion at college once. Week 4: friend said my points were clearer; next focus — listening and responding to others.",
        },
      },
      {
        id: "avoid-pitfalls",
        heading: "Pitfalls to avoid",
        paragraphs: [
          "Avoid labelling yourself with OLQ words in the interview or SDT ('I have very good organising ability'). Instead, describe what you did and let the listener draw the conclusion.",
          "Avoid trying to display all fifteen qualities in every task. Behave naturally and contribute genuinely; forced dominance in a group task usually works against cooperation.",
          "Also avoid treating any single test as a verdict on your personality. Practice scores and feedback, including AI-assisted feedback in this app, point to habits you can work on; they are not judgements of who you are or predictions of an SSB result.",
        ],
      },
      {
        id: "qualities-together",
        heading: "How the qualities work together",
        paragraphs: [
          "The qualities are described separately, but in real situations they combine. Taking initiative without cooperation can look like dominance; cooperation without initiative can look like passivity. Speed of decision without reasoning can lead to careless choices, while reasoning without decisiveness can lead to delay.",
          "A useful way to think about this is balance. In a group planning exercise, for example, a candidate who listens, builds on a good idea from someone else, suggests a clear plan within the time and helps the group agree is showing several qualities at once without trying to.",
          "When you reflect on a group activity, ask yourself not only what you did, but how it affected the group's result. That question naturally draws attention to the social qualities that are easy to overlook when preparing alone.",
        ],
      },
    ],
    exercises: [
      {
        title: "Evidence inventory",
        instructions:
          "For each of the four factors, write one real example from the last two years that shows a quality in that group. Where you cannot find one, plan an activity that would create such an example in the next month.",
      },
      {
        title: "Four-week log",
        instructions:
          "Select two qualities and keep a weekly log in the sample format for four weeks. At the end, ask a friend or mentor whether they noticed any change.",
      },
      {
        title: "Describe, do not label",
        instructions:
          "Rewrite three sentences from your SDT draft that use OLQ labels so that they describe actions instead. For example, replace 'I am responsible' with what you were responsible for and how it went.",
      },
    ],
    takeaways: [
      "OLQs are commonly described as fifteen qualities in four factors.",
      "They show in everyday behaviour, not in vocabulary.",
      "Build qualities through small, regular, real responsibilities.",
      "Track two or three qualities at a time and seek honest feedback.",
    ],
  },
  {
    slug: "ssb-preparation-schedule",
    title: "A 30-day SSB preparation schedule",
    category: "Tips & Strategies",
    description:
      "A four-week plan covering psychology tests, group tasks, interview practice and fitness before your SSB.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Plan the final month before the SSB across all three assessment techniques.",
      "Balance practice with reflection, fitness and rest.",
      "Prepare your PIQ and documents well before reporting.",
    ],
    sections: [
      {
        id: "how-to-use",
        heading: "How to use this schedule",
        paragraphs: [
          "This plan assumes you have about a month before your SSB and roughly two to three hours a day. Adjust it to your situation; if you have more time, extend each week rather than adding more hours per day.",
          "The SSB generally runs over several days, beginning with a screening stage (an intelligence test and a picture perception and discussion test), followed for those who qualify by psychology tests, group tasks and the personal interview, and ending with a conference. Your call-up letter and the official recruitment website describe the reporting and procedure for your board, so read them first.",
        ],
      },
      {
        id: "week-one",
        heading: "Week 1: foundation and self-understanding",
        paragraphs: [
          "Start with yourself. Fill in a practice PIQ form accurately and draft your SDT answers honestly. Read about the SSB procedure from official sources and understand what each test involves.",
          "Begin daily fitness and light practice: a few WAT words and SRT situations, and one TAT story every other day. Do not worry about speed yet.",
        ],
        bullets: [
          "Practice PIQ and SDT drafts.",
          "OIR-style reasoning questions, 20 minutes daily.",
          "Daily run and basic strength routine.",
          "Daily current affairs reading, 20 minutes.",
        ],
      },
      {
        id: "week-two",
        heading: "Week 2: psychology tests and expression",
        paragraphs: [
          "Increase psychology test practice and work towards the timings used at the SSB. Review your responses as a set to check consistency.",
          "Start speaking practice: narrate a story from a picture within the time given in PPDT practice, and practise a short group discussion with friends or on a recorded topic.",
        ],
      },
      {
        id: "week-three",
        heading: "Week 3: group tasks and interview",
        paragraphs: [
          "Learn the format of group tasks such as group discussion, group planning exercise, progressive and half group tasks, lecturette and command task. Practise lecturettes on familiar topics and group planning exercises with friends if possible.",
          "Conduct mock interviews based on your PIQ. Ask someone to question you on your family, education, hobbies, achievements, reasons for joining and current affairs, and to follow up on your answers.",
        ],
      },
      {
        id: "week-four",
        heading: "Week 4: integration, rest and logistics",
        paragraphs: [
          "Reduce new material. Do one complete practice cycle of tests at realistic timings early in the week, then focus on revision, sleep and fitness maintenance.",
          "Prepare documents listed in your call-up letter, plan travel, and pack sports clothes and formal clothes as instructed. Arrive rested rather than exhausted from last-minute practice.",
        ],
        example: {
          label: "Sample day in week 3",
          text: "6:00 am: 30-minute run and stretching. 7:00 am: current affairs notes, 20 minutes. Evening 5:00 pm: 2 TAT stories, 30 WAT words, 15 SRT situations at practice timing. 6:00 pm: lecturette preparation on one topic and a 3-minute delivery. 7:00 pm: mock interview with a friend on PIQ questions, 30 minutes. 8:00 pm: review today's responses together for consistency. 10:00 pm: sleep.",
        },
      },
      {
        id: "staying-balanced",
        heading: "Staying balanced through the month",
        paragraphs: [
          "Overtraining in the last month leads to fatigue and anxiety. Keep at least one half-day a week free for rest, family or a hobby, and protect seven to eight hours of sleep.",
          "Remember that the SSB assesses potential. Your aim this month is to be prepared, rested and genuinely yourself — not to transform into a different person.",
          "If you miss a day or two because of college, work or illness, do not try to make up every lost hour. Pick up from the current day's plan and drop the least important practice from the missed days. A plan that bends is more useful than one that breaks.",
        ],
      },
      {
        id: "measuring-progress",
        heading: "Measuring progress during the month",
        paragraphs: [
          "Without some measure of progress, a month of practice can feel like running in place. Choose a few simple indicators and record them once a week, so that you can see change and adjust the plan.",
          "Useful indicators are practical rather than numerical scores alone: whether you complete WAT and SRT sets within the time, whether your TAT stories have a clear beginning, action and outcome, how comfortable you feel speaking for three minutes, and how your timed run is improving.",
        ],
        bullets: [
          "Psychology tests: percentage of responses completed within practice timings.",
          "Expression: length of time you can speak clearly on a topic without notes.",
          "Interview: number of PIQ-based questions you can answer with a specific example.",
          "Fitness: your timed run and basic strength targets.",
        ],
      },
    ],
    exercises: [
      {
        title: "Personalise the plan",
        instructions:
          "Copy the four weekly headings into your notebook and write your own daily activities under each, based on your available time. Mark your rest half-day for each week.",
      },
      {
        title: "Mock interview",
        instructions:
          "Ask a mentor, teacher or family member to conduct a 30-minute interview using only your practice PIQ. Note three questions you found hard and prepare honest, specific answers to them.",
      },
      {
        title: "Complete practice cycle",
        instructions:
          "In week 4, attempt one complete set of psychology tests at practice timings in a single sitting. Review the full set together for consistency with your SDT and PIQ.",
      },
    ],
    takeaways: [
      "Read your call-up letter and official procedure first.",
      "Move from self-understanding to practice to integration across four weeks.",
      "Practise all three techniques: psychology, group tasks and interview.",
      "Keep fitness, sleep and rest in the plan; arrive fresh.",
    ],
  },
  {
    slug: "final-week-revision-guide",
    title: "Final-week revision guide and checklist",
    category: "Tips & Strategies",
    description:
      "How to use the last week before a written exam or SSB for revision, logistics and rest.",
    updatedOn: UPDATED_ON,
    objectives: [
      "Plan a final week that consolidates what you already know.",
      "Prepare documents and logistics early to avoid last-minute stress.",
      "Use simple routines for sleep, food and nerves before the exam or SSB.",
    ],
    sections: [
      {
        id: "principles",
        heading: "Principles for the last week",
        paragraphs: [
          "The final week is for consolidation, not new learning. Revise from your own notes and error logs, because they contain what you specifically need. Starting a new book now usually creates anxiety rather than marks.",
          "Keep the routine close to the exam timetable. If your exam starts in the morning, study and attempt practice papers in the morning so that your mind is alert at that hour.",
        ],
      },
      {
        id: "written-exam-revision",
        heading: "Revision plan for a written exam",
        paragraphs: [
          "Divide the week between subjects in proportion to their weight and your weaknesses, and attempt at most two or three full-length papers so that you have time to analyse them.",
        ],
        example: {
          label: "Sample final-week plan (NDA written)",
          text: "Day 1: Mathematics formula sheet and error log; one full Mathematics paper. Day 2: English — vocabulary notes and grammar rules; one GAT paper. Day 3: General Knowledge static notes (Polity, History, Geography). Day 4: Science notes and current affairs of the last few months. Day 5: one full Mathematics paper in exam timing; analysis. Day 6: light revision of all formula sheets and notes; check admit card, centre route and documents. Day 7 (day before exam): short revision only, early dinner, early sleep.",
        },
      },
      {
        id: "ssb-revision",
        heading: "Revision plan for the SSB",
        paragraphs: [
          "Re-read your practice PIQ and make sure you can speak about every entry. Revise current affairs notes and your short balanced views on recurring themes. Do light practice of WAT and SRT to keep your speed, but avoid long sessions.",
          "Keep up gentle physical activity so that you are fresh for the group tasks, and do not try a new, demanding workout in the last week.",
          "Prepare two or three short lecturette outlines on familiar subjects and rehearse your self-introduction once a day. Spend a few minutes each evening recalling real examples from your life — responsibilities, setbacks, team experiences — so that they come to mind easily when an interviewer asks a follow-up question.",
        ],
      },
      {
        id: "checklist",
        heading: "Logistics checklist",
        paragraphs: [
          "Complete logistics by mid-week. Read the admit card or call-up letter instructions again; they list what is required and what is not allowed.",
        ],
        bullets: [
          "Admit card or call-up letter printed, with spare copies as instructed.",
          "Photo identity proof and original documents listed in the instructions, with photocopies.",
          "Passport-size photographs if required.",
          "Exam centre or SSB board location, route and travel time checked in advance.",
          "Permitted stationery only; check the list of prohibited items.",
          "For SSB: formal clothes, sports kit and the items listed in the call-up letter.",
        ],
      },
      {
        id: "sleep-food-nerves",
        heading: "Sleep, food and managing nerves",
        paragraphs: [
          "Sleep at a regular time all week. Eat familiar, simple food, especially the day before, and drink enough water. Avoid staying up late for revision on the final night.",
          "Some nervousness is normal. Slow breathing, a short walk and reminding yourself of the preparation you have done help more than last-minute cramming. In the exam hall, read instructions calmly before starting.",
          "Limit screen time in the final days, especially late at night. Exam forums and group chats often spread rumours about papers or procedures, which only add worry. Check official websites once a day for any update and then put the phone away.",
        ],
      },
      {
        id: "exam-day-approach",
        heading: "Approach on the day",
        paragraphs: [
          "For a written exam, reach the centre well before the reporting time printed on the admit card. Read every instruction on the question paper and answer sheet before you begin, and fill in personal details carefully, since errors here can cost more than a wrong answer.",
          "Use a simple pass strategy: attempt questions you are confident about first, mark doubtful ones, and return to them if time allows. Keep the negative marking rule from the notification in mind and avoid blind guessing.",
          "For the SSB, follow the reporting instructions in your call-up letter exactly, be courteous to everyone, and treat each day as a fresh start. A difficult task on one day does not decide the outcome; carry on calmly and give your genuine best to the next activity.",
        ],
      },
      {
        id: "after-the-exam",
        heading: "After the exam",
        paragraphs: [
          "Avoid long discussions comparing answers immediately afterwards; they rarely help. Rest for a day, then record what went well and what you would change for next time while it is fresh.",
          "Check results and further instructions only on the official website of the conducting body.",
        ],
      },
    ],
    exercises: [
      {
        title: "Write your final-week plan",
        instructions:
          "Using the sample, write a day-by-day plan for your own final week with specific notes, papers and logistics tasks for each day. Put it where you will see it every morning.",
      },
      {
        title: "Checklist dry run",
        instructions:
          "Three days before your exam or SSB, physically gather every item on the logistics checklist into one bag or folder and tick each one off. Note anything missing and arrange it the same day.",
      },
      {
        title: "One-page revision sheet",
        instructions:
          "For each subject or test, condense your notes and error log onto a single page: key formulas, frequent mistakes, and five facts you tend to forget. Use only these sheets for revision on the last two days.",
      },
    ],
    takeaways: [
      "Use the last week to consolidate from your own notes, not to start new material.",
      "Match your study hours to the exam timing.",
      "Finish logistics by mid-week, guided by the admit card or call-up letter.",
      "Protect sleep and routine; check results only on official websites.",
    ],
  },
];
