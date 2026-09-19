// MOCK CONTENT — isolated per AGENTS.md §8. This is placeholder practice
// content (standard SSB-style prompts), not real user/activity data, but it
// is still not the final content bank: TAT uses text scene descriptions
// rather than real picture stimuli because no image asset pipeline exists
// yet (blocker B5, status.md). Swapping in real assets/content later means
// changing this file only — lib/api/practice.ts and every component stay
// the same.

import type { PracticeActivitySummary, PracticeItem, PsychologyTestType } from "@/types/practice";

export const PRACTICE_ACTIVITIES: PracticeActivitySummary[] = [
  {
    testType: "tat",
    title: "TAT — Thematic Apperception Test",
    description: "Write a short story for each scene, then one final story of your own choosing.",
    itemCount: 13,
    durationLabel: "30s view + 4 min write, per picture",
  },
  {
    testType: "wat",
    title: "WAT — Word Association Test",
    description: "Write the first sentence that comes to mind for each word.",
    itemCount: 60,
    durationLabel: "15s per word",
  },
  {
    testType: "srt",
    title: "SRT — Situation Reaction Test",
    description: "React to each everyday situation with what you would actually do.",
    itemCount: 60,
    durationLabel: "30 minutes total",
  },
  {
    testType: "sdt",
    title: "SDT — Self Description Test",
    description: "Describe yourself from five different points of view.",
    itemCount: 5,
    durationLabel: "15 minutes total",
  },
];

const TAT_SCENES = [
  "A young person stands at a doorway, looking out into a stormy night, with a lit lamp beside them.",
  "A group of people sit around a table, some pointing at documents, one person staring into the distance.",
  "A figure stands atop a hill, overlooking a village below at dawn.",
  "Two people sit facing each other across a desk; one is speaking, the other is silent, looking down.",
  "A crowd gathers near a building entrance; a few onlookers watch from windows above.",
  "A person kneels beside another who appears to have fallen, in an outdoor setting.",
  "A rope bridge stretches across a gorge; someone stands at the edge deciding whether to cross.",
  "A worker stands beside broken machinery in a workshop, looking uncertain.",
  "A parent and child sit together in a dim room, the child looking up expectantly.",
  "A soldier stands at attention before a senior officer inside a tent.",
  "A person is illuminated by a single window of light in an otherwise dark room, papers scattered on the floor.",
  "Several people wait in a line outside an office, with one person checking a watch impatiently.",
];

const TAT_BLANK = "No picture is shown for this final story — imagine your own scene and write about it.";

const WAT_WORDS = [
  "Duty", "Fear", "Friends", "Failure", "Success", "Leader", "Danger", "Family", "Death", "Courage",
  "Fight", "Help", "Team", "Weakness", "Strength", "Enemy", "Discipline", "Honesty", "Trust", "Betrayal",
  "Sacrifice", "Ambition", "Justice", "Anger", "Patience", "Confidence", "Loyalty", "Responsibility", "Freedom", "Risk",
  "Victory", "Defeat", "Hope", "Doubt", "Bravery", "Panic", "Order", "Rules", "Command", "Obedience",
  "Rebellion", "Peace", "War", "Nation", "Soldier", "Officer", "Mission", "Plan", "Crisis", "Decision",
  "Truth", "Lie", "Praise", "Criticism", "Change", "Challenge", "Opportunity", "Sorrow", "Joy", "Pride",
];

const SRT_SITUATIONS = [
  "You are walking alone at night when you notice someone following you.",
  "Your friend is caught cheating in an exam and asks you not to tell anyone.",
  "You see a fire breaking out in a neighboring house.",
  "Your team loses an important match because of your mistake.",
  "You find a wallet full of cash on the road.",
  "Your junior refuses to follow your instructions during a task.",
  "You are stuck in a traffic jam and late for an important interview.",
  "A stranger asks you for directions to a place you don't know.",
  "Your best friend borrows money and forgets to return it.",
  "You witness a road accident while driving to work.",
  "Your boss assigns you a task with an unrealistic deadline.",
  "You see a child crying alone in a crowded market.",
  "Your phone battery dies just before an important call.",
  "A colleague takes credit for your idea in front of everyone.",
  "You are asked to lead a group of strangers on a trek.",
  "Your vehicle breaks down on a deserted highway at night.",
  "You find out a close friend has been lying to you.",
  "Your team disagrees with your plan during a group task.",
  "You are the only one who knows how to fix a critical problem at work.",
  "A younger sibling looks up to you for advice on a tough decision.",
  "You are blamed for something you did not do.",
  "Your flight gets cancelled and you must reach your destination urgently.",
  "You see someone shoplifting in a store.",
  "Your group is lost while trekking in unfamiliar terrain.",
  "A friend confides in you about a serious personal problem.",
  "You are given charge of a task you have never done before.",
  "Your subordinate makes a costly mistake during an important project.",
  "You overhear a plan that could harm someone if not stopped.",
  "Your close friend is being bullied by a group of people.",
  "You are asked to make a quick decision with incomplete information.",
  "Your team's morale is low after a series of failures.",
  "You see an elderly person struggling to cross a busy road.",
  "Your plans for the day are disrupted by unexpected heavy rain.",
  "A new member joins your team and struggles to fit in.",
  "You realize you made an error in an important report just before submission.",
  "Your neighbor's house is being burgled while they are away.",
  "You are asked to resolve a conflict between two close friends.",
  "Your resources are insufficient to complete an assigned task on time.",
  "You find a group of people arguing loudly in a public place.",
  "Your senior gives you feedback that feels unfair.",
  "You must choose between helping a friend and completing your own work.",
  "A stranger collapses in front of you on the street.",
  "Your team member is injured during an outdoor exercise.",
  "You are put in charge during an emergency with no clear instructions.",
  "Your request for leave is denied just before a family emergency.",
  "You notice a safety hazard that others have ignored.",
  "A friend asks you to cover for their mistake.",
  "You are stranded with your group due to a sudden weather change.",
  "Your work is criticized publicly by someone senior to you.",
  "You must convince a reluctant team to follow a new plan.",
  "Your effort goes unnoticed while someone else gets the credit.",
  "You find an unattended bag in a crowded place.",
  "A close relative needs urgent help while you are away from home.",
  "Your team is split on an important decision and time is running out.",
  "You are unexpectedly asked to give a speech in front of a large audience.",
  "Your plan fails despite careful preparation.",
  "You see a group of people ignoring safety instructions during an activity.",
  "A junior colleague comes to you for guidance during a crisis.",
  "You are the last one to leave and notice something suspicious.",
  "Your team succeeds, but you feel the credit was unfairly distributed.",
];

const SDT_PROMPTS = [
  "What does your father think of you?",
  "What does your mother think of you?",
  "What do your teachers or employers think of you?",
  "What do your friends or colleagues think of you?",
  "What do you think of yourself, and what would you like to become?",
];

function toItems(prompts: string[], prefix: string): PracticeItem[] {
  return prompts.map((prompt, index) => ({ id: `${prefix}-${index + 1}`, prompt }));
}

export function getPracticeItems(testType: PsychologyTestType): PracticeItem[] {
  switch (testType) {
    case "tat":
      return [...toItems(TAT_SCENES, "tat"), { id: "tat-13", prompt: TAT_BLANK }];
    case "wat":
      return toItems(WAT_WORDS, "wat");
    case "srt":
      return toItems(SRT_SITUATIONS, "srt");
    case "sdt":
      return toItems(SDT_PROMPTS, "sdt");
  }
}
