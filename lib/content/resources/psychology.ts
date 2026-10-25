// Editorial content — Psychology Tests (TAT, WAT, SRT, SDT).
// Written for EliteCadet as preparation guidance. Nothing here is insider
// assessor knowledge or a prediction of any SSB outcome.

import type { ResourceArticle } from "@/types/resources";

export const PSYCHOLOGY_RESOURCES: ResourceArticle[] = [
  // ---------------------------------------------------------------------------
  // 1. Understanding the TAT
  // ---------------------------------------------------------------------------
  {
    slug: "understanding-tat",
    title: "Understanding the TAT",
    category: "Psychology Tests",
    description: "What assessors actually look for in a TAT story, and common mistakes to avoid.",
    updatedOn: "2026-10-25",
    featured: true,
    objectives: [
      "Understand the format and timing of the Thematic Apperception Test at SSB.",
      "Know what a TAT story is generally understood to reveal about the writer.",
      "Learn a simple structure that keeps every story complete within four minutes.",
      "Recognise the most common mistakes candidates make and how to avoid them.",
    ],
    sections: [
      {
        id: "what-the-tat-is",
        heading: "What the TAT is and how it runs",
        paragraphs: [
          "The Thematic Apperception Test (TAT) is usually the first test of the psychology series. You are shown a set of 12 pictures, one after another, on a screen. Eleven of them are hazy or ambiguous scenes, and the last one is a blank slide on which you write a story of your own choosing.",
          "Each picture is shown for about 30 seconds. The picture is then removed, and you get about 4 minutes to write a story based on what you perceived. After four minutes the next picture appears, whether or not you have finished. This rhythm continues until all 12 stories are done.",
          "Because the pictures are deliberately unclear, there is no single correct interpretation. What you see in the picture, what you make the characters do, and how you resolve the situation all come from you. That is the basic idea behind a projective test: the story reflects the way the writer tends to think and act.",
        ],
        bullets: [
          "12 pictures in total, the last one blank.",
          "About 30 seconds to observe each picture.",
          "About 4 minutes to write each story.",
          "Stories are written in your own words; there is no prescribed length, but most complete stories fall between 80 and 150 words.",
        ],
      },
      {
        id: "what-the-story-shows",
        heading: "What a TAT story is generally understood to show",
        paragraphs: [
          "SSB psychology tests are widely discussed in terms of the Officer Like Qualities (OLQs) — a general framework of qualities such as effective intelligence, reasoning ability, organising ability, social adaptability, cooperation, sense of responsibility, initiative, self-confidence, speed of decision, courage, determination and stamina. Treat this list as a useful lens for self-review, not as a scoring sheet. Nobody outside the assessment process knows exactly how a particular story is evaluated.",
          "With that caution in mind, a well-written TAT story usually makes a few things visible. The central character (often called the hero) has a clear goal. The hero notices a problem or opportunity, thinks about it sensibly, takes practical action, involves other people where it makes sense, and reaches a believable outcome.",
          "A story is not judged on literary style. Simple English, short sentences and a clear sequence of events are far more useful than vocabulary or dramatic twists. What matters is that the hero's thinking and behaviour seem natural and constructive.",
        ],
      },
      {
        id: "a-simple-structure",
        heading: "A simple structure: past, present, future",
        paragraphs: [
          "Many candidates find it easiest to think of a story in three parts. First, what led to this moment (the background). Second, what is happening in the picture and what the hero is thinking or planning (the present). Third, what the hero does and how the situation ends (the outcome).",
          "The largest share of your words should go to the action. Background should take one or two sentences at most. A common error is to spend three minutes describing the setting and the hero's family, then rush the ending in a single line.",
          "Give the hero a name, an age and a role that fits the picture. This is not decoration; it helps you think concretely about what such a person could realistically do.",
        ],
        bullets: [
          "Background: 1–2 sentences on who the hero is and what led here.",
          "Present: what the hero notices, feels briefly, and decides.",
          "Action: the steps the hero takes, including help from others.",
          "Outcome: a realistic result, stated clearly in the final line.",
        ],
      },
      {
        id: "weak-versus-improved",
        heading: "Worked example: a weak story and an improved one",
        paragraphs: [
          "Imagine a hazy picture of a young man standing near a broken-down bus on a village road, with a few people sitting by the roadside. Below are two stories written for the same picture.",
          "The first story is descriptive and passive. It tells us what the hero feels but not what he does, and the outcome happens by chance. The second story keeps the same situation but shows the hero observing, deciding, organising and following through.",
        ],
        example: {
          label: "Weak story vs improved story",
          text: "WEAK: Ravi was travelling to his uncle's house. The bus broke down in the middle of nowhere. He was very worried and angry because he would be late. Everyone was sitting and waiting. After many hours another bus came and he reached home late at night. He decided never to travel by that bus again.\n\nIMPROVED: Ravi, a 20-year-old engineering student, was travelling home for his sister's engagement when the bus broke down near a small village. The driver said the fuel pipe had cracked and the next bus was four hours away. Ravi noticed that an elderly couple and a mother with a small child were already tired in the heat. He asked the driver for the depot number and called the depot himself to report the exact location. He then walked with the conductor to the village, found a mechanic's shop, and arranged for a mechanic to come on his motorcycle. While the repair was going on, he organised water from a nearby handpump for the passengers. The pipe was temporarily fixed within ninety minutes, and the bus reached the next town, where the depot had a replacement vehicle ready. Ravi reached home in time for the function and later wrote to the depot suggesting that drivers carry a basic repair kit.",
        },
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes to avoid",
        paragraphs: [
          "Most weak stories fail for a small number of repeated reasons. Recognising these in your own practice stories is more valuable than reading many model stories.",
          "Negative or tragic themes are not forbidden — real life includes accidents, illness and failure — but a story that ends in death, despair or the hero giving up, with no constructive response, gives the reader little to see. If the picture suggests something sad, let the hero respond to it sensibly.",
        ],
        bullets: [
          "Describing the picture instead of telling a story about it.",
          "A hero who only thinks, feels or worries, and never acts.",
          "Luck, a stranger or a superior solving the problem for the hero.",
          "Unrealistic heroics: one person catching ten armed robbers single-handed.",
          "Leaving the story unfinished when the four minutes run out.",
          "Copying memorised stories that do not fit the picture shown.",
          "Writing every story about joining the forces, regardless of the picture.",
        ],
      },
      {
        id: "the-blank-slide",
        heading: "Approaching the blank slide",
        paragraphs: [
          "The twelfth picture is blank. You are free to imagine any scene and write a story about it. Because there is no picture to react to, this story is often seen as the most direct expression of what is on your mind.",
          "There is no need to prepare a grand story for it. Choose a situation from ordinary life that you understand well — a college event, a community problem in your area, a sports team, a family responsibility — and write it with the same structure as the others. Many candidates find it helpful to briefly describe the imagined picture in their first line, then move into the story.",
        ],
      },
    ],
    exercises: [
      {
        title: "Timed single-story drill",
        instructions:
          "Pick any photograph from a newspaper that shows people in an unclear situation. Look at it for 30 seconds, turn it face down, and write a story in exactly 4 minutes using a timer. Repeat with 3 different photographs. Afterwards, underline every sentence where the hero actually does something, and check that at least half your sentences are underlined.",
      },
      {
        title: "Rewrite a weak story",
        instructions:
          "Take the weak story about Ravi above and write your own improved version in 4 minutes without looking at the model. Then compare: did your hero notice a specific problem, take at least two practical steps, involve other people, and reach a clear outcome?",
      },
      {
        title: "Mistake audit",
        instructions:
          "Collect 6 stories you have written in earlier practice. For each one, mark which of the seven common mistakes listed in this article appear. Write down the one mistake that appears most often and focus only on fixing that in your next 6 stories.",
      },
    ],
    takeaways: [
      "The TAT has 12 pictures, including one blank slide, with about 30 seconds of viewing and 4 minutes of writing each.",
      "A good story shows a realistic hero who notices a problem, acts sensibly and reaches a clear outcome.",
      "Spend most of your words on action, not on background or feelings.",
      "Simple language and a complete story matter more than style or dramatic plots.",
      "Use the OLQs as a lens for reviewing your own stories, not as a checklist to stuff into every story.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. TAT story-writing techniques with practice examples
  // ---------------------------------------------------------------------------
  {
    slug: "tat-story-writing-practice",
    title: "TAT story-writing techniques with practice examples",
    category: "Psychology Tests",
    description: "Four described picture prompts with model stories, plus techniques for writing under time pressure.",
    updatedOn: "2026-10-25",
    objectives: [
      "Use the 30-second viewing window to collect the details a story needs.",
      "Plan a complete story in your head before you start writing.",
      "Practise on four described picture prompts and compare your stories with model versions.",
      "Build a weekly practice routine that improves both speed and quality.",
    ],
    sections: [
      {
        id: "using-the-thirty-seconds",
        heading: "Using the 30 seconds well",
        paragraphs: [
          "Thirty seconds is short, but it is enough if you look with purpose. Try to answer four questions while the picture is on the screen: How many people are there? What is their approximate age and gender? What is the setting? What seems to be happening or about to happen?",
          "Once you have these answers, pick the person who will be your hero — usually the most prominent figure, or someone of roughly your own age. Decide in a few seconds what the main problem or goal is. Do not wait for a perfect idea; the first sensible interpretation is usually good enough.",
        ],
        bullets: [
          "Count the characters and note their rough ages.",
          "Identify the setting: indoor, outdoor, village, city, field, hospital, office.",
          "Notice the mood: calm, tense, busy, worried, celebrating.",
          "Choose the hero and the core situation before the picture disappears.",
        ],
      },
      {
        id: "planning-in-your-head",
        heading: "Planning before the pen moves",
        paragraphs: [
          "Spend the first 15 to 20 seconds of the writing time silently fixing the outline: who, what problem, two or three actions, and the ending. Candidates who start writing immediately often lose direction halfway and either run out of time or end abruptly.",
          "Write the ending in your mind first. If you know where the story is going, every sentence can move towards it. A practical way is to decide the last line before you write the first one.",
          "Aim to finish with 15 to 20 seconds to spare, so you can read the story once and fix an obviously missing outcome. You will not have time to rewrite, so the plan is what keeps the story complete.",
        ],
      },
      {
        id: "prompt-one-classroom",
        heading: "Practice prompt 1: the empty classroom",
        paragraphs: [
          "Picture description: A young woman sits alone at a desk in a classroom in the evening, with books open in front of her. Through the window you can see a sports ground with a few children playing. Her expression is hard to read.",
          "Many interpretations are possible — a teacher preparing a lesson, a student studying for an exam, a volunteer planning something for the children outside. Any of these works if the story moves towards action.",
        ],
        example: {
          label: "Model story for prompt 1",
          text: "Meera, a 23-year-old teacher in a government school in her town, noticed that many of her Class 8 students were failing mathematics because they had no help at home. One evening she stayed back after school and looked at their test papers to find the common errors. She found that most students were weak in fractions and percentages. She prepared short worksheets on these topics and spoke to the principal about running a free one-hour class after school three days a week. She also asked two senior students who were good at mathematics to help the younger ones. Some parents were hesitant at first, so she met them on a Saturday and explained the plan. Within two months, the class's average marks improved noticeably, and the principal asked other teachers to start similar support classes for science and English.",
        },
      },
      {
        id: "prompt-two-river",
        heading: "Practice prompt 2: figures near a river",
        paragraphs: [
          "Picture description: Two young men stand on the bank of a swollen river after heavy rain. One is pointing towards the far bank, where a few huts are visible. The sky is dark.",
          "This picture invites a rescue or relief story. Keep it realistic: one or two young men cannot fight a flood alone, but they can inform authorities, organise local help and use available resources safely.",
        ],
        example: {
          label: "Model story for prompt 2",
          text: "Arjun and his friend Sandeep, both college students home for the monsoon break, were checking the river level after two days of heavy rain. They saw that the water had risen close to the huts on the far bank, where a few labour families lived. Arjun immediately called the village sarpanch and the local disaster helpline to inform them. Since the bridge was still above water, the two friends crossed it and asked the families to move their children, elderly members and essential documents to the panchayat school on higher ground. Sandeep went back to the village to arrange food and dry clothes with the help of the school headmaster, while Arjun stayed with the families and helped the elderly walk across. By the time the water entered the huts that night, all twelve families were safe in the school. The administration later provided compensation for the damaged huts, and the panchayat decided to keep a flood shelter plan ready every monsoon.",
        },
      },
      {
        id: "prompt-three-office",
        heading: "Practice prompt 3: the meeting room",
        paragraphs: [
          "Picture description: An older man sits at the head of a table, looking at some papers. A younger man stands beside him, gesturing towards a chart on the wall. Two others at the table look on.",
          "Avoid stories where the young man is scolded and simply feels bad, or where the senior solves everything. Let the younger character bring an idea, face a reasonable objection and handle it maturely.",
        ],
        example: {
          label: "Model story for prompt 3",
          text: "Karan, a 25-year-old production engineer at a small textile unit, noticed that the factory was wasting a lot of fabric during cutting. He studied the cutting process for two weeks, measured the waste and prepared a simple chart showing how a different layout could save material. He presented it to the owner, Mr Sharma, and two supervisors. Mr Sharma was doubtful because the change would slow down work initially. Karan suggested trying it on one machine for a month and offered to train the operators himself. The supervisors agreed to support the trial. At the end of the month, fabric waste on that machine had come down clearly and output had returned to normal. Mr Sharma approved the layout for all machines, and Karan was given responsibility for training the other operators.",
        },
      },
      {
        id: "prompt-four-hospital",
        heading: "Practice prompt 4: outside a hospital",
        paragraphs: [
          "Picture description: A woman in her forties sits on a bench in a hospital corridor, her head slightly bowed. A boy of about fifteen stands next to her, holding a file.",
          "This is the kind of picture where many candidates write a sad story that ends in grief. Illness is real, and the story does not need a miracle. It needs a character who responds with responsibility and calm.",
        ],
        example: {
          label: "Model story for prompt 4",
          text: "Rohit, a Class 10 student, had brought his mother to the district hospital because his father, a truck driver, had been admitted after a road accident on the highway. His mother was worried about the cost of treatment and his father's long absence from work. Rohit spoke to the duty doctor to understand his father's condition and learnt that he needed a minor operation and six weeks of rest. He then asked the hospital help desk about government health schemes and found that his father was eligible for free treatment under a state scheme. He collected the required documents from home with the help of a neighbour. During the six weeks, he took up evening tuition for two younger children in his colony to support the household, while continuing his own studies. His father recovered fully, and Rohit passed his board exams with good marks.",
        },
      },
      {
        id: "weekly-routine",
        heading: "A weekly practice routine",
        paragraphs: [
          "Quality improves faster through a small number of carefully reviewed stories than through a large number of rushed ones. Three or four sessions a week, each with a full set or half set of pictures, is a reasonable pace for most candidates.",
          "Keep all your stories in one notebook with the date. Every two weeks, read your old stories and notice patterns: Do your heroes always act alone? Do your stories end weakly? Are the outcomes realistic? This kind of self-review is the real source of improvement.",
        ],
      },
    ],
    exercises: [
      {
        title: "Four-prompt set",
        instructions:
          "Read the description of each of the four practice prompts above for 30 seconds only, then cover it and write a story in 4 minutes. Do all four back to back without a break. Only after finishing all four, compare your stories with the model stories and note one specific improvement for each.",
      },
      {
        title: "Ending-first planning",
        instructions:
          "For 6 newspaper or magazine photographs, spend 30 seconds looking and 20 seconds deciding only the final sentence of the story. Write the final sentence first at the bottom of the page, then write the rest of the story above it in 3 minutes 40 seconds.",
      },
      {
        title: "Blank-slide practice",
        instructions:
          "Write 3 blank-slide stories on three different days, each in 4 minutes, each set in a different part of your own life (studies, family or neighbourhood, sports or hobbies). Check that each one has a clear problem, actions taken by the hero, and an outcome.",
      },
      {
        title: "Full 12-picture simulation",
        instructions:
          "Once a fortnight, ask a friend or family member to show you 11 varied photographs for 30 seconds each, followed by a blank page, with a strict 4-minute writing timer between them. Count how many of the 12 stories you completed with a clear outcome.",
      },
    ],
    takeaways: [
      "Use the 30 seconds to fix the characters, setting, mood and the hero's main situation.",
      "Decide the ending before you start writing, so every sentence moves towards it.",
      "Model stories are for comparison, not memorisation; the picture you get will always be different.",
      "Realistic action, help from others and a clear outcome make a story complete.",
      "Regular review of your own old stories teaches you more than reading new model stories.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. Building better WAT response habits
  // ---------------------------------------------------------------------------
  {
    slug: "wat-response-habits",
    title: "Building better WAT response habits",
    category: "Psychology Tests",
    description: "Why your first instinct matters more than a clever sentence.",
    updatedOn: "2026-10-25",
    featured: true,
    objectives: [
      "Understand how the Word Association Test runs and why speed is central to it.",
      "Learn what makes a WAT sentence natural, constructive and complete.",
      "Recognise habits that weaken responses, such as preaching, negativity and overthinking.",
      "Build a daily habit that makes good responses come naturally.",
    ],
    sections: [
      {
        id: "how-the-wat-runs",
        heading: "How the WAT runs",
        paragraphs: [
          "In the Word Association Test (WAT), 60 words are shown one after another, each for 15 seconds. As each word appears, you write the first sentence or phrase that comes to mind in connection with it. When the 15 seconds are over, the next word appears automatically.",
          "Fifteen seconds is enough to read a word, think briefly and write a short sentence, but not enough to construct something elaborate. This is deliberate: the test is generally understood to capture your spontaneous associations rather than prepared answers.",
          "If you miss a word, leave its line blank and move on immediately. Trying to go back costs you the next word as well. Number your answer sheet carefully so that a missed word does not shift all later answers onto the wrong lines.",
        ],
      },
      {
        id: "why-first-instinct-matters",
        heading: "Why your first instinct matters",
        paragraphs: [
          "Your first association with a word often reflects how you habitually think. Someone who sees the word 'failure' and immediately thinks of learning and trying again is showing a different pattern from someone who thinks of shame or fear. This is why a clever sentence that took ten seconds to construct is less useful than a natural one that came quickly.",
          "This does not mean you should write whatever random thing comes to mind without any thought. It means your preparation should work on your thinking habits, so that your first instinct is already constructive. That is a slow process built through daily reflection, not a last-week trick.",
          "Memorising sentences for common words is a poor strategy. You will not know which words come, a memorised sentence often does not fit naturally, and responses across sixty words that all sound rehearsed lose their value as a picture of you.",
        ],
      },
      {
        id: "qualities-of-a-good-response",
        heading: "Qualities of a good response",
        paragraphs: [
          "A good WAT response is short, grammatically simple and relates directly to the word. It usually shows a practical, positive or realistic view of the idea behind the word, often through an action or an observation from life.",
          "Positive does not mean unrealistic. 'Exams are always easy' is not positive thinking; it is simply untrue. 'Regular revision makes exams manageable' is realistic and constructive.",
        ],
        bullets: [
          "Short: roughly 5 to 10 words that can be written in under 12 seconds.",
          "Relevant: clearly connected to the given word.",
          "Constructive: shows a way of dealing with things rather than complaining.",
          "Natural: sounds like something you would actually say.",
          "Varied: not every sentence begins with 'I' or ends with 'success'.",
        ],
      },
      {
        id: "weak-and-better-sentences",
        heading: "Worked examples: weak and better sentences",
        paragraphs: [
          "The examples below compare common weak responses with better alternatives. Notice that the better versions are not more impressive; they are simply more natural and more constructive.",
          "Preachy sentences such as 'One should always...' or 'We must never...' are a frequent weakness. They sound like advice to others rather than a reflection of how you think and act. Prefer observations and actions over sermons.",
        ],
        example: {
          label: "Word: weak response / better response",
          text: "FAILURE: 'Failure makes me sad and depressed.' / 'Failure showed me where to practise more.'\n\nFEAR: 'Fear is very dangerous for a person.' / 'Facing small fears regularly builds confidence.'\n\nMOTHER: 'One should always respect his mother.' / 'My mother manages the house with great patience.'\n\nCROWD: 'Crowds are irritating and noisy.' / 'Volunteers guided the crowd safely at the mela.'\n\nDEFEAT: 'Defeat is the end of all hopes.' / 'Our team analysed the defeat and trained harder.'\n\nNIGHT: 'Night is dark and scary.' / 'Watchmen keep the colony safe at night.'",
        },
      },
      {
        id: "habits-to-drop",
        heading: "Habits to drop",
        paragraphs: [
          "Several habits commonly weaken WAT responses. Most of them come from trying too hard to impress rather than responding honestly.",
          "Negative words such as 'death', 'enemy', 'accident' or 'loss' will appear. You do not have to pretend they are pleasant. A realistic, constructive response acknowledges the reality and shows a sensible way of dealing with it, for example 'Quick first aid saved the accident victim.'",
        ],
        bullets: [
          "Writing only the word's dictionary meaning ('Courage means bravery.').",
          "Preaching with 'should', 'must' and 'always' in every sentence.",
          "Forcing the forces or the nation into every response.",
          "Using famous quotations or proverbs instead of your own thought.",
          "Repeating the same sentence structure for many words.",
          "Leaving many words blank because you were searching for a perfect sentence.",
        ],
      },
      {
        id: "building-the-habit",
        heading: "Building the habit day by day",
        paragraphs: [
          "Since the test reflects habitual thinking, the most useful preparation happens outside practice sessions. Reading a daily newspaper, taking part in activities, and noticing how people around you handle problems gives you a wide stock of real-life associations.",
          "Short daily practice is better than occasional long sessions. Ten to fifteen words a day, written under a 15-second timer and then reviewed calmly, builds speed and clarity without making your responses mechanical.",
        ],
      },
    ],
    exercises: [
      {
        title: "Fifteen-word daily drill",
        instructions:
          "Ask someone to read out or show you 15 random everyday words, one every 15 seconds, or use a timer while flipping through word cards. Write one sentence for each. Afterwards, mark each sentence as natural, preachy, negative or off-topic, and rewrite only the preachy and negative ones.",
      },
      {
        title: "Sentence-opening variety check",
        instructions:
          "Take your last 30 WAT responses and count how many begin with 'I', 'We', 'One should' or the word itself. If more than one-third use the same opening, write 10 new responses deliberately starting with a person, a place or an action instead.",
      },
      {
        title: "Negative-word practice",
        instructions:
          "Write responses for these 10 words at 15 seconds each: loss, fear, enemy, accident, defeat, pain, alone, dark, fail, quarrel. Review each for realism: does it acknowledge the reality while showing a sensible response?",
      },
    ],
    takeaways: [
      "The WAT has 60 words shown for 15 seconds each; speed and spontaneity are central.",
      "Work on your thinking habits so that your first instinct is constructive, rather than memorising sentences.",
      "Prefer short, natural observations and actions over preaching and definitions.",
      "Negative words deserve realistic, constructive responses, not forced cheerfulness.",
      "Never get stuck on one word; leave it and move on.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. WAT practice: 60 words and how to review them
  // ---------------------------------------------------------------------------
  {
    slug: "wat-practice-and-improvement",
    title: "WAT practice: 60 words and how to review them",
    category: "Psychology Tests",
    description: "A full 60-word practice set, model responses and a step-by-step method to review your answers.",
    updatedOn: "2026-10-25",
    objectives: [
      "Complete a full 60-word WAT practice set under realistic timing.",
      "Compare your responses with a selection of model responses.",
      "Use a simple review method to find patterns in your own answers.",
      "Plan focused follow-up practice based on what the review shows.",
    ],
    sections: [
      {
        id: "setting-up",
        heading: "Setting up a realistic practice session",
        paragraphs: [
          "To get value from this set, recreate the test conditions as closely as you can. Use a plain sheet numbered 1 to 60 before you begin. Ask a friend or family member to read each word aloud, or write the words on cards and use a timer that beeps every 15 seconds.",
          "Do not read the full list before attempting it. The word list is printed in this article in groups so you can use it, but cover the list and reveal one word at a time. Once the 60 words are done, take a short break before reviewing.",
        ],
        bullets: [
          "Number your sheet 1 to 60 in advance.",
          "15 seconds per word, no pausing, no going back.",
          "If you miss a word, leave the line blank and continue.",
          "Total time is 15 minutes of writing.",
        ],
      },
      {
        id: "words-one-to-thirty",
        heading: "Practice words 1 to 30",
        paragraphs: [
          "These are ordinary words of the kind commonly used in WAT practice. Some are neutral, some suggest positive ideas and some suggest difficulty. Respond to each on its own; do not try to link them together.",
        ],
        bullets: [
          "1. Team",
          "2. Failure",
          "3. River",
          "4. Leader",
          "5. Night",
          "6. Mother",
          "7. Challenge",
          "8. Book",
          "9. Fear",
          "10. Village",
          "11. Help",
          "12. Money",
          "13. Rain",
          "14. Friend",
          "15. Mistake",
          "16. Discipline",
          "17. Doctor",
          "18. Road",
          "19. Alone",
          "20. Game",
          "21. Teacher",
          "22. Work",
          "23. Accident",
          "24. Country",
          "25. Time",
          "26. Quarrel",
          "27. Farmer",
          "28. Win",
          "29. Tired",
          "30. Plan",
        ],
      },
      {
        id: "words-thirty-one-to-sixty",
        heading: "Practice words 31 to 60",
        paragraphs: [
          "Continue without a break from word 30 to word 31. Many candidates slow down in the second half as attention drops, so this half is where consistent pace matters most.",
        ],
        bullets: [
          "31. Water",
          "32. Brother",
          "33. Defeat",
          "34. Honest",
          "35. Hill",
          "36. Exam",
          "37. Danger",
          "38. Father",
          "39. Society",
          "40. Lazy",
          "41. Sports",
          "42. Hospital",
          "43. Responsibility",
          "44. Train",
          "45. Enemy",
          "46. Music",
          "47. Lost",
          "48. Neighbour",
          "49. Courage",
          "50. Problem",
          "51. Morning",
          "52. Duty",
          "53. Weak",
          "54. Election",
          "55. Smile",
          "56. Sacrifice",
          "57. Crowd",
          "58. Dark",
          "59. Hope",
          "60. Future",
        ],
      },
      {
        id: "model-responses",
        heading: "Model responses for selected words",
        paragraphs: [
          "The responses below are examples, not answers to copy. Your own sentence for the same word can be quite different and still be just as good. Use them to see the qualities that make a response work: short, relevant, natural and constructive.",
          "Notice that none of these sentences preach, none are dictionary definitions, and most describe a real action or observation. Several of them show other people, not just 'I'.",
        ],
        example: {
          label: "Selected model responses",
          text: "TEAM: Our team divided the work and finished early.\nFAILURE: Failure in the first attempt guided my preparation.\nRIVER: Villagers cleaned the river bank together.\nLEADER: A good leader listens before deciding.\nNIGHT: Nurses work through the night in hospitals.\nFEAR: Practice reduced my fear of public speaking.\nALONE: Living alone in the hostel taught me to cook.\nACCIDENT: Bystanders gave first aid at the accident spot.\nQUARREL: The two friends sorted out their quarrel by talking.\nTIRED: A short rest and I was ready to continue.\nDEFEAT: The coach reviewed the defeat with the players.\nLAZY: A fixed timetable helped him overcome laziness.\nENEMY: Soldiers guard the border against enemy intrusion.\nLOST: The guard helped the lost child find her parents.\nWEAK: Extra practice strengthened his weak subjects.\nDARK: Solar lamps lit up the dark village lanes.",
        },
      },
      {
        id: "how-to-review",
        heading: "How to review your 60 responses",
        paragraphs: [
          "The review is where the real learning happens. Go through your sheet with a coloured pen and mark each response using a few simple tags. Do this honestly; nobody else needs to see it.",
          "Once tagged, count each category. The numbers themselves are only for you, but they show where to focus. For example, if many responses are preachy, your next practice sets should focus on writing observations and actions. If many lines are blank, focus on speed and on accepting the first reasonable idea.",
          "Finally, read all 60 responses together as if they were written by a stranger. Ask what kind of person this seems to be. Is that picture consistent with who you actually are and how you behave? This one question is often more revealing than any tagging.",
        ],
        bullets: [
          "B — blank or incomplete.",
          "P — preachy ('should', 'must', 'always', 'never').",
          "N — negative without any constructive element.",
          "D — dictionary meaning or definition.",
          "O — off-topic or forced (unrelated to the word).",
          "G — good: natural, relevant and constructive.",
        ],
      },
      {
        id: "follow-up-practice",
        heading: "Planning follow-up practice",
        paragraphs: [
          "Do not repeat the same 60 words immediately; you will simply recall your earlier sentences. Instead, make new lists of everyday words from newspapers, textbooks and conversations. Mixing neutral, positive and difficult words gives the most realistic practice.",
          "A full 60-word set once or twice a week, plus short 15-word drills on other days, is a reasonable rhythm. Keep your sheets dated, and compare your tag counts every few weeks to see real change.",
        ],
      },
    ],
    exercises: [
      {
        title: "Full 60-word set",
        instructions:
          "Attempt all 60 words in this article at 15 seconds each, with a helper or timer, without reading ahead. Total writing time is 15 minutes. Record how many lines you left blank.",
      },
      {
        title: "Tag and count",
        instructions:
          "Tag every one of your 60 responses as B, P, N, D, O or G using the review method above. Write down the count for each tag and the single category you most want to reduce in your next set.",
      },
      {
        title: "Targeted rewrite",
        instructions:
          "Choose the 10 weakest responses from your sheet. Rewrite each one in 15 seconds, then compare the new version with the old one. Keep the rewrite only if it is shorter or more natural, not merely more impressive.",
      },
      {
        title: "Build your own list",
        instructions:
          "Over the next week, collect 60 new everyday words from your reading (20 neutral, 20 positive, 20 difficult), shuffle them, and use them for your next timed full set.",
      },
    ],
    takeaways: [
      "Practise under real conditions: 60 words, 15 seconds each, no going back.",
      "Model responses show qualities to aim for; they are not sentences to memorise.",
      "Tagging your responses reveals patterns that a quick read-through misses.",
      "Read your full sheet as a stranger would and ask whether it reflects the real you.",
      "Use fresh word lists for each practice set so that you respond, not recall.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. Practising decisiveness for the SRT
  // ---------------------------------------------------------------------------
  {
    slug: "srt-decisiveness",
    title: "Practising decisiveness for the SRT",
    category: "Psychology Tests",
    description: "How to react to a situation instead of describing it.",
    updatedOn: "2026-10-25",
    featured: true,
    objectives: [
      "Understand the format and time pressure of the Situation Reaction Test.",
      "Learn to write responses that state actions rather than feelings or opinions.",
      "Balance speed with practical, responsible and realistic reactions.",
      "Recognise common weaknesses such as vague, heroic or incomplete responses.",
    ],
    sections: [
      {
        id: "how-the-srt-runs",
        heading: "How the SRT runs",
        paragraphs: [
          "The Situation Reaction Test (SRT) gives you a booklet of 60 everyday situations, and you have 30 minutes to write your reaction to as many as you can. That works out to about 30 seconds per situation, including reading time.",
          "The situations are drawn from ordinary life: problems at home, in college, at work, while travelling, in sports, in the community. Some are small inconveniences and some are emergencies. You write what you would do, in a short phrase or sentence.",
          "Because the time is tight, many candidates do not reach all 60. Attempting more situations with sensible responses is usually better than a few beautifully written ones, but responses that are so rushed they lose meaning do not help either. The goal is a steady pace with clear, practical answers.",
        ],
      },
      {
        id: "react-dont-describe",
        heading: "React, don't describe",
        paragraphs: [
          "The most common weakness in SRT responses is describing a feeling or an opinion instead of an action. 'I would feel very bad' or 'This is a serious matter' tells the reader nothing about what you would actually do.",
          "A strong response begins with an action verb and states the most important step or steps. Where a situation has more than one problem, address the most urgent one first and, if time allows, the next one.",
        ],
        example: {
          label: "Situation with weak and strong responses",
          text: "SITUATION: He was going for an important interview when he saw a man injured in a road accident, with nobody stopping to help.\n\nWEAK: He would feel sorry but would go for the interview because it was important for his career.\n\nWEAK (overly heroic): He took the man on his shoulders, ran to the hospital, donated blood and still reached the interview on time.\n\nSTRONG: Called 108 for an ambulance, gave basic first aid, asked a bystander to stay with the man, informed the interview office about the delay and reached as soon as possible.\n\nWHY: The strong response shows the person taking responsibility for the emergency, involving others, and still handling his own commitment honestly. It is realistic and action-based.",
        },
      },
      {
        id: "elements-of-a-strong-response",
        heading: "Elements of a strong response",
        paragraphs: [
          "Strong responses tend to share a few features. They do not need to be long; many good responses are a single line with two or three actions separated by commas.",
          "Writing in the third person ('He would...' or simply starting with the verb) is common because the booklet usually describes the situation in the third person. Either form is fine; consistency and clarity matter more than grammar style.",
        ],
        bullets: [
          "Starts with an action, not a feeling.",
          "Deals with the most urgent part of the situation first.",
          "Uses available resources and people sensibly.",
          "Is realistic for an ordinary person in that position.",
          "Shows responsibility for others where relevant.",
          "Reaches a resolution, even if only implied.",
        ],
      },
      {
        id: "decisiveness-without-recklessness",
        heading: "Decisiveness without recklessness",
        paragraphs: [
          "Decisiveness means choosing a sensible course of action quickly, not choosing the most dramatic one. Jumping into a flooded river without being able to swim, or confronting armed robbers alone, is not decisive; it is reckless and usually helps nobody.",
          "At the same time, waiting for someone else to act, or reporting everything to a superior without doing anything yourself, can look like avoidance of responsibility. Good responses do what is within your own capacity and bring in the right help for what is beyond it.",
        ],
        example: {
          label: "Balancing action and realism",
          text: "SITUATION: While trekking with friends, one of them slipped and twisted his ankle badly, and it is getting dark.\n\nRECKLESS: Carried him down the mountain alone in the dark.\n\nPASSIVE: Waited for help to come.\n\nBALANCED: Tied his ankle firmly, shared the load among the group, helped him walk down slowly using torches, and phoned the base camp for assistance.",
        },
      },
      {
        id: "common-weaknesses",
        heading: "Common weaknesses",
        paragraphs: [
          "Reviewing practice responses against a short list of common weaknesses is the fastest way to improve. Most candidates find that two or three of these appear again and again in their own answers.",
        ],
        bullets: [
          "Feelings or opinions only ('He would be shocked').",
          "Vague actions ('He would handle it properly', 'He would do the needful').",
          "Superhero responses that no ordinary person could carry out.",
          "Passing every problem to parents, police or a senior without acting.",
          "Ignoring part of a two-part situation.",
          "Leaving many situations unattempted because of slow early pace.",
        ],
      },
      {
        id: "building-speed",
        heading: "Building speed over weeks",
        paragraphs: [
          "Speed in the SRT comes from familiarity with the kind of thinking it needs, not from writing faster. When you regularly ask yourself 'What would I actually do?' in real situations, the answers start coming more quickly on paper.",
          "Start with sets of 10 situations in 5 minutes, then 20 in 10 minutes, then a full 60 in 30 minutes. Review each set before moving to the next, and keep a list of your repeated weaknesses on the first page of your practice notebook.",
        ],
      },
    ],
    exercises: [
      {
        title: "Ten in five",
        instructions:
          "Write 10 everyday situations of your own (from home, college, travel or sports) on separate lines. Then set a 5-minute timer and write a response to each. Underline the first word of each response and check that it is an action verb.",
      },
      {
        title: "Fix the weak responses",
        instructions:
          "Take the two weak responses and the reckless and passive responses in this article. Without looking at the model, write your own strong response to each situation in 30 seconds. Then compare with the article's version and note any action you missed.",
      },
      {
        title: "Two-part situations",
        instructions:
          "Write 5 situations that contain two problems at once (for example, an exam tomorrow and a sick younger sibling at home). Respond to each in 30 seconds, making sure your response addresses both problems in a sensible order.",
      },
    ],
    takeaways: [
      "The SRT has 60 situations to be answered in 30 minutes — about 30 seconds each.",
      "Write what you would do, starting with an action, not what you would feel.",
      "Decisive does not mean dramatic; choose realistic actions and bring in the right help.",
      "Deal with the most urgent part of a situation first, and address every part if you can.",
      "Build speed gradually through regular, reviewed practice sets.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 6. SRT practice situations with explained responses
  // ---------------------------------------------------------------------------
  {
    slug: "srt-practice-situations",
    title: "SRT practice situations with explained responses",
    category: "Psychology Tests",
    description: "Sixteen everyday situations with model responses and a one-line explanation for each.",
    updatedOn: "2026-10-25",
    objectives: [
      "Practise responding to a varied set of realistic situations under time pressure.",
      "Compare your responses with model responses and understand the reasoning behind each.",
      "Notice which kinds of situations you handle well and which slow you down.",
      "Prepare to attempt a full 60-situation set in 30 minutes.",
    ],
    sections: [
      {
        id: "how-to-use-this-set",
        heading: "How to use this practice set",
        paragraphs: [
          "This article contains 16 practice situations grouped by setting. For the best results, cover the model responses, set a timer for 30 seconds per situation, and write your own response first. Only then read the model response and explanation.",
          "The model responses are one reasonable way to act, not the only correct one. If your response is different but practical, responsible and complete, it is a good response. Use the explanation line to check whether your response covered the same essential point.",
        ],
      },
      {
        id: "home-and-family",
        heading: "Home and family situations",
        paragraphs: [
          "Situations at home often test how you balance your own commitments with responsibility towards family members. Look for the most urgent need and act on it, while still dealing with your own task sensibly.",
        ],
        example: {
          label: "Situations 1 to 4",
          text: "1. SITUATION: His mother fell ill at night and his father was out of town.\nRESPONSE: Checked her condition, called the family doctor, took her to the nearest hospital with a neighbour's help and informed his father.\nWHY: Acts immediately, uses nearby help and keeps the family informed.\n\n2. SITUATION: His younger brother failed in two subjects and was afraid to tell their parents.\nRESPONSE: Spoke to him calmly, went with him to tell the parents, and made a study plan to help him prepare for the re-test.\nWHY: Supports the brother honestly instead of hiding the problem.\n\n3. SITUATION: On the day of his exam, the power went off and his alarm did not ring; he woke up late.\nRESPONSE: Got ready quickly, took an auto instead of the bus, carried his admit card and reached the centre before the gate closed.\nWHY: Focuses on the practical steps to still reach on time.\n\n4. SITUATION: Relatives were visiting for a week just before his final exams.\nRESPONSE: Helped the family with hosting in the evenings, studied early in the morning and at the library during the day.\nWHY: Balances family courtesy with his own responsibilities.",
        },
      },
      {
        id: "college-and-work",
        heading: "College and work situations",
        paragraphs: [
          "In college and workplace situations, look for initiative, fairness and the ability to work with others. Avoid responses where you simply complain to a senior without trying anything yourself first.",
        ],
        example: {
          label: "Situations 5 to 8",
          text: "5. SITUATION: He was made group leader for a project, but two members were not contributing.\nRESPONSE: Spoke to them individually, gave each a clear task they were comfortable with, set deadlines and reviewed progress twice a week.\nWHY: Handles the issue directly and constructively before escalating.\n\n6. SITUATION: He noticed a classmate copying in an internal test.\nRESPONSE: Spoke to him after the test about the risk and offered to help him prepare; informed the teacher if it happened again.\nWHY: Stays honest while giving the classmate a fair chance to correct himself.\n\n7. SITUATION: His manager gave him an urgent task at 5 pm that would take three hours.\nRESPONSE: Informed his family, planned the work, completed it that evening and reported to the manager.\nWHY: Accepts responsibility without complaint and keeps others informed.\n\n8. SITUATION: He was asked to organise the annual sports day with only two weeks' notice.\nRESPONSE: Formed a small committee, divided duties, booked the ground, fixed the event list and held daily ten-minute progress checks.\nWHY: Shows organising ability through clear planning and delegation.",
        },
      },
      {
        id: "travel-and-public",
        heading: "Travel and public situations",
        paragraphs: [
          "Situations on the road, in trains or in public places often involve strangers. Good responses help others where it is safe and practical, and involve authorities such as police, railway staff or medical services appropriately.",
        ],
        example: {
          label: "Situations 9 to 12",
          text: "9. SITUATION: While travelling by train, he found that his wallet and ticket had been stolen.\nRESPONSE: Informed the TTE, paid the fare with UPI or borrowed from a co-passenger against his address, and lodged a complaint with the railway police at the next station.\nWHY: Deals with the immediate problem and reports the theft properly.\n\n10. SITUATION: He saw smoke coming out of a shop in the market at night.\nRESPONSE: Called the fire brigade on 101, alerted the nearby shopkeepers and residents, and kept people away from the shop until help arrived.\nWHY: Raises the alarm quickly and keeps people safe without taking reckless risks.\n\n11. SITUATION: An elderly woman at the bus stop looked confused and could not remember her address.\nRESPONSE: Spoke to her gently, checked her bag for any phone number or ID, and took her to the nearest police help desk.\nWHY: Shows care and uses the right authority to reunite her with her family.\n\n12. SITUATION: His bike's tyre burst on a highway, far from any town, in the evening.\nRESPONSE: Moved the bike to the side safely, called a roadside assistance or nearby mechanic, and if unavailable, sought a lift with the bike to the next town.\nWHY: Puts safety first and finds a practical way forward.",
        },
      },
      {
        id: "community-and-emergencies",
        heading: "Community and emergency situations",
        paragraphs: [
          "Emergencies test whether you can stay calm and act quickly. The strongest responses identify the single most important action — usually ensuring safety or getting medical help — and then deal with what follows.",
        ],
        example: {
          label: "Situations 13 to 16",
          text: "13. SITUATION: Heavy rain flooded the low-lying area of his town, and many families were stranded.\nRESPONSE: Informed the municipal disaster helpline, joined local volunteers to move families to the community hall, and helped arrange food and drinking water.\nWHY: Combines alerting authorities with practical help at ground level.\n\n14. SITUATION: During a cricket match, a player from the other team collapsed on the field.\nRESPONSE: Stopped the match, called for medical help, gave basic first aid and kept the crowd away until help arrived.\nWHY: Puts a person's safety above the game and acts promptly.\n\n15. SITUATION: He found that people in his colony were dumping garbage in a vacant plot, causing mosquitoes.\nRESPONSE: Discussed it with the residents' association, arranged a cleaning drive, and requested the municipality to place a garbage bin nearby.\nWHY: Takes initiative and involves the community to solve the problem lastingly.\n\n16. SITUATION: While crossing a lonely street at night, he heard someone shouting for help from a lane.\nRESPONSE: Called 112, alerted nearby residents, and went towards the lane with them to help.\nWHY: Responds with courage while involving others and the police for safety.",
        },
      },
      {
        id: "reviewing-your-set",
        heading: "Reviewing your responses",
        paragraphs: [
          "After comparing all 16 responses, sort your own answers into three groups: those that covered the same essential point as the model, those that were reasonable but missed something important, and those that were vague, feeling-based or unrealistic.",
          "Look at the settings where you did best and worst. Many candidates find emergencies easy but struggle with situations involving people, such as a non-cooperating teammate or a classmate who is cheating. Those are the situations to practise more.",
          "When you are comfortable with these 16, move to a full set of 60 situations in 30 minutes, made from situations you write yourself or collect from practice books. Keep the same review method each time.",
        ],
      },
    ],
    exercises: [
      {
        title: "Covered-answer attempt",
        instructions:
          "Cover the responses for all 16 situations in this article. Set a timer for 8 minutes (30 seconds per situation) and write your own response to each. Then uncover and mark each of yours as 'same essential point', 'missed something' or 'vague/unrealistic'.",
      },
      {
        title: "Write your own twenty",
        instructions:
          "Write 20 new situations based on your own daily life, five each from home, college or work, travel, and community. Exchange them with a friend preparing for SSB, respond to each other's situations in 10 minutes, and discuss each other's answers.",
      },
      {
        title: "Full 60 in 30",
        instructions:
          "Once you have at least 60 situations collected, attempt them all in one 30-minute sitting without a break. Record how many you attempted, and how many of those you would mark as complete and practical on review.",
      },
    ],
    takeaways: [
      "Write your response before reading the model, or the practice loses most of its value.",
      "A different response can be just as good if it is practical, responsible and complete.",
      "Emergencies need the single most important action first, usually safety or medical help.",
      "Situations involving people often need more practice than physical emergencies.",
      "Progress from short timed sets to a full 60 situations in 30 minutes.",
    ],
  },

  // ---------------------------------------------------------------------------
  // 7. Writing an honest Self Description
  // ---------------------------------------------------------------------------
  {
    slug: "sdt-honest-self-description",
    title: "Writing an honest Self Description",
    category: "Psychology Tests",
    description: "Why consistency across all five SDT prompts matters more than praise.",
    updatedOn: "2026-10-25",
    featured: true,
    objectives: [
      "Understand the format of the Self Description Test and its five paragraphs.",
      "Learn how to gather honest opinions about yourself before the SSB.",
      "Write paragraphs that are specific, balanced and consistent with each other.",
      "Describe areas for improvement in a mature and genuine way.",
    ],
    sections: [
      {
        id: "format-of-the-sdt",
        heading: "The format of the SDT",
        paragraphs: [
          "The Self Description Test (SDT) is the last written test of the psychology series. You have 15 minutes to write five short paragraphs about yourself, as seen from different points of view.",
          "Fifteen minutes for five paragraphs means roughly three minutes each. That is enough for four to six honest sentences per paragraph, but not enough to think everything through from scratch on the day. This is why reflecting on yourself well before the SSB is so useful.",
        ],
        bullets: [
          "What your parents think of you.",
          "What your teachers (or employer or supervisors, if you are working) think of you.",
          "What your friends think of you.",
          "What you yourself think of you — your strengths and your weaknesses or areas to improve.",
          "What kind of person you would like to become, or the qualities you want to develop.",
        ],
      },
      {
        id: "why-consistency-matters",
        heading: "Why consistency matters more than praise",
        paragraphs: [
          "Your SDT is one of several pieces of information about you during the SSB, along with your Personal Information Questionnaire, your other psychology tests, the group tasks and the interview. It is widely understood that these are looked at together, so a self-description that does not match how you come across elsewhere stands out.",
          "A description full of praise — hard-working, honest, brilliant leader, always helpful, loved by all — is not convincing, because no real person is like that, and because it is unlikely to match your behaviour across five days of testing. A balanced description with specific strengths and genuine areas to improve is more believable and more useful.",
          "Consistency also matters within the SDT itself. If your parents see you as reserved but your friends see you as the life of every party, explain the difference, or think again about whether both are true.",
        ],
      },
      {
        id: "gathering-honest-opinions",
        heading: "Gathering honest opinions before the SSB",
        paragraphs: [
          "The best preparation for the SDT is to actually ask the people concerned. Talk to your parents, a teacher or supervisor who knows you well, and two or three close friends. Ask them what they see as your strengths and where they think you could improve.",
          "Listen without arguing. Some feedback may surprise you or feel unfair. Note it down anyway. Often the most useful insight is a point that several people mention independently.",
          "Then compare what others say with your own view of yourself. Where they match, you have solid material. Where they differ, think about why. This reflection is valuable in itself, because the interview often explores the same ground.",
        ],
      },
      {
        id: "writing-each-paragraph",
        heading: "Writing each paragraph",
        paragraphs: [
          "Each paragraph should give concrete qualities, ideally with a brief real example, and include at least one point of improvement where it fits naturally. Avoid long lists of adjectives without any illustration.",
          "Write in simple first-person sentences: 'My parents think I am...' or 'According to my friends...'. Keep the tone respectful towards everyone you mention, including when describing their criticism of you.",
        ],
        example: {
          label: "Sample paragraphs (illustrative, not to copy)",
          text: "PARENTS: My parents feel I am responsible and dependable at home. Since my father's transfer, I have managed the household bills and my sister's school admission. They also feel I get impatient when things do not go to plan, and they want me to be calmer with my younger sister.\n\nTEACHERS: My teachers see me as sincere and good at practical work, especially in the physics lab. They appreciated that I organised the science exhibition in my final year. They have told me that I need to improve my written expression, as my answers are often too brief.\n\nFRIENDS: My friends consider me reliable and someone who keeps the group together when we plan trips or matches. They also say I find it hard to say no, which sometimes leaves me with too much on my plate.\n\nSELF: I think my main strengths are consistency and a willingness to take responsibility. I am working on speaking up in large groups, where I tend to wait too long before sharing my view, and I have joined the college debating club for this reason.\n\nWHO I WANT TO BECOME: I want to become a calmer and more confident person who can lead a team through difficult situations, communicate clearly in writing and speech, and stay physically fit throughout my life.",
        },
      },
      {
        id: "describing-weaknesses",
        heading: "Describing areas for improvement",
        paragraphs: [
          "Many candidates either avoid weaknesses entirely or offer fake ones such as 'I work too hard' or 'I am too honest'. Both approaches make the description less believable.",
          "A genuine area for improvement, described with what you are doing about it, shows self-awareness and maturity. It does not need to be dramatic. Ordinary points such as impatience, shyness in large groups, procrastination with certain tasks, or difficulty saying no are honest and relatable.",
          "Avoid labelling yourself with clinical or psychological terms. Describe behaviour instead: 'I sometimes leave revision to the last week' is clear and honest; heavy labels are neither helpful nor appropriate.",
        ],
        bullets: [
          "Choose a real point that people who know you would recognise.",
          "Describe it as behaviour, not as a fixed trait or label.",
          "Add what you are actively doing to improve it.",
          "Keep it consistent with what you say in the interview.",
        ],
      },
      {
        id: "common-pitfalls",
        heading: "Common pitfalls",
        paragraphs: [
          "Reviewing a practice SDT against a short list of pitfalls helps catch problems before the real test. Read your draft as if it were written by someone you do not know.",
        ],
        bullets: [
          "Writing only praise, with no area for improvement anywhere.",
          "Repeating the same adjectives in all five paragraphs.",
          "Contradictions between paragraphs that are not explained.",
          "Running out of time and leaving the last paragraph incomplete.",
          "Writing what you think assessors want to read instead of what is true.",
        ],
      },
    ],
    exercises: [
      {
        title: "Feedback interviews",
        instructions:
          "Over one week, ask at least five people — a parent, a teacher or supervisor, and three friends — the same two questions: 'What do you see as my main strengths?' and 'What is one thing I should improve?' Write their answers down word for word, without arguing.",
      },
      {
        title: "Timed SDT draft",
        instructions:
          "Using your feedback notes, write all five paragraphs in exactly 15 minutes, giving yourself about 3 minutes per paragraph. Check that every paragraph has at least one specific example and that at least two paragraphs mention a genuine area for improvement.",
      },
      {
        title: "Consistency check",
        instructions:
          "Read your draft SDT alongside your last practice TAT stories and WAT responses. List any trait you claim in the SDT that never appears in your other answers, and any repeated pattern in your other answers that your SDT does not mention. Discuss these with someone who knows you well.",
      },
    ],
    takeaways: [
      "The SDT gives you 15 minutes for five paragraphs: parents, teachers or employer, friends, yourself, and who you want to become.",
      "Balanced, specific and honest descriptions are more convincing than praise.",
      "Ask the people concerned for real feedback well before the SSB.",
      "Describe areas for improvement as behaviour, together with what you are doing about them.",
      "Keep your self-description consistent with your PIQ, other tests and interview answers.",
    ],
  },
];
