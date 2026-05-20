// Canonical Phase-1 scenario seeds. This file is the human-readable source of
// truth. The matching SQL INSERTs live in
// supabase/migrations/20260519160000_scenarios_seed.sql — when you edit one,
// edit the other. The canonical.test.ts row-count check keeps them in sync.
//
// Bodies follow the open-source LSP method-card framing, paraphrased. No
// LEGO/LSP trademarks in the copy.

import type { StageType } from '@/lib/sessions/types';

export interface CanonicalScenario {
  stage_type: StageType;
  title: string;
  body: string;
  tags: string[];
  duration_minutes: number;
}

export const CANONICAL_SCENARIOS: CanonicalScenario[] = [
  // ── skill_building (4) ──
  {
    stage_type: 'skill_building',
    title: 'Tower of any height',
    body: 'Build the tallest tower you can in three minutes using only the bricks in front of you. There is no right answer — pay attention to which bricks you reach for first.',
    tags: ['warmup', 'tactile'],
    duration_minutes: 5,
  },
  {
    stage_type: 'skill_building',
    title: 'Build your morning',
    body: 'Build a small scene that shows how your morning began today. Include one thing that felt easy and one that felt heavy. Two minutes to build, one minute to share.',
    tags: ['warmup', 'storytelling'],
    duration_minutes: 8,
  },
  {
    stage_type: 'skill_building',
    title: 'Explain a brick',
    body: 'Choose a brick that catches your eye. Without naming its colour or shape, tell the person next to you what it could represent. Swap and repeat.',
    tags: ['warmup', 'metaphor'],
    duration_minutes: 6,
  },
  {
    stage_type: 'skill_building',
    title: 'Metaphor warm-up',
    body: 'Pick three bricks. Combine them into one small object that stands for the word "trust". Share what each brick is doing in the metaphor.',
    tags: ['warmup', 'metaphor'],
    duration_minutes: 8,
  },

  // ── individual_model (4) ──
  {
    stage_type: 'individual_model',
    title: 'Your role today',
    body: 'Build a model of the role you play in this team right now — not the title on the org chart, but what you actually do day to day. Include at least one thing you are proud of and one thing you find heavy.',
    tags: ['identity', 'role'],
    duration_minutes: 15,
  },
  {
    stage_type: 'individual_model',
    title: 'Your ideal team',
    body: 'Build a model that shows what your team looks like at its best. What is present that is often missing? What is absent that you would like to remove?',
    tags: ['vision', 'culture'],
    duration_minutes: 20,
  },
  {
    stage_type: 'individual_model',
    title: 'A win you are proud of',
    body: 'Build a small scene from a moment in the last quarter that you are proud of. Include the people, the obstacle, and the move that unlocked it.',
    tags: ['reflection', 'wins'],
    duration_minutes: 15,
  },
  {
    stage_type: 'individual_model',
    title: 'A challenge you face',
    body: 'Build a model of a challenge you are sitting with right now. Show what is making it hard. Do not solve it yet — the goal is to put it on the table.',
    tags: ['reflection', 'challenges'],
    duration_minutes: 20,
  },

  // ── shared_model (4) ──
  {
    stage_type: 'shared_model',
    title: 'Combine into one landscape',
    body: 'Bring your individual models into the centre. Rearrange them into one shared landscape that tells the group story. Negotiate placement out loud — no silent moves.',
    tags: ['merge', 'co-create'],
    duration_minutes: 30,
  },
  {
    stage_type: 'shared_model',
    title: 'Find the common ground',
    body: 'Look at the individual models together. Which elements appear in more than one? Cluster them. The clusters become the foundations of the shared model.',
    tags: ['merge', 'patterns'],
    duration_minutes: 25,
  },
  {
    stage_type: 'shared_model',
    title: 'Map the territory',
    body: 'Treat the table as the territory. Place each individual model where it belongs — centre, edge, inside, outside. Discuss what the geography is telling you.',
    tags: ['merge', 'spatial'],
    duration_minutes: 30,
  },
  {
    stage_type: 'shared_model',
    title: 'Connect your contributions',
    body: 'Build short bridges between elements of different individual models that depend on each other. The bridges show how the work flows between you.',
    tags: ['merge', 'dependencies'],
    duration_minutes: 25,
  },

  // ── system_model (4) ──
  {
    stage_type: 'system_model',
    title: 'Show the forces',
    body: 'Look at the shared landscape. What forces push on it from outside the group? Build them in. Direction and weight matter — long sticks for pressure, short bricks for resistance.',
    tags: ['systems', 'forces'],
    duration_minutes: 25,
  },
  {
    stage_type: 'system_model',
    title: 'Add the agents',
    body: 'Identify the people, teams, customers, or systems that act on the shared model. Place a figure for each one. Where do they sit relative to the work — close, distant, adversarial, supportive?',
    tags: ['systems', 'stakeholders'],
    duration_minutes: 25,
  },
  {
    stage_type: 'system_model',
    title: 'Energy flows',
    body: 'Trace how energy moves through the system. Where does it come from? Where does it accumulate? Where does it leak away? Use connectors or directional bricks.',
    tags: ['systems', 'flow'],
    duration_minutes: 30,
  },
  {
    stage_type: 'system_model',
    title: 'Tensions and supports',
    body: 'Find one place where two parts of the system pull against each other, and one place where two parts hold each other up. Build both clearly so the rest of the room can see them.',
    tags: ['systems', 'tension'],
    duration_minutes: 25,
  },

  // ── guiding_principles (4) ──
  {
    stage_type: 'guiding_principles',
    title: 'Anchor a principle to each cluster',
    body: 'For every cluster on the system model, write a one-sentence principle that the group will hold when it acts on that part of the system. Anchor the sentence next to the cluster with a single brick.',
    tags: ['principles', 'anchoring'],
    duration_minutes: 30,
  },
  {
    stage_type: 'guiding_principles',
    title: 'Phrase it as a behaviour',
    body: 'Take each draft principle and rephrase it as a behaviour. "We value transparency" becomes "We tell each other about decisions before they ship." Pin the behaviour next to its anchor brick.',
    tags: ['principles', 'behaviour'],
    duration_minutes: 25,
  },
  {
    stage_type: 'guiding_principles',
    title: 'The principle test',
    body: 'Run each principle against the system model. Where would it have helped in the past month? Where would it have hurt? Keep the principle, sharpen it, or drop it.',
    tags: ['principles', 'pressure-test'],
    duration_minutes: 25,
  },
  {
    stage_type: 'guiding_principles',
    title: 'Working agreement candidates',
    body: 'Choose the three principles you would be willing to sign as a working agreement starting tomorrow. Build a small model of each as a commitment, not an aspiration.',
    tags: ['principles', 'commitment'],
    duration_minutes: 30,
  },
];
