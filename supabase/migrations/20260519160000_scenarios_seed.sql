-- supabase/migrations/20260519160000_scenarios_seed.sql
-- Seed the 20 canonical templates (4 per stage). Hand-mirrored from
-- lib/scenarios/canonical.ts; the canonical.test.ts row-count assertion
-- enforces parity at CI time. Idempotent: only inserts when no templates
-- exist (so re-running db:reset replays seeds, but a partial-apply will
-- not duplicate them).

do $$
begin
  if not exists (select 1 from public.scenarios where is_template = true) then
    insert into public.scenarios (stage_type, title, body, tags, duration_minutes, is_template, org_id) values
      ('skill_building', 'Tower of any height', 'Build the tallest tower you can in three minutes using only the bricks in front of you. There is no right answer — pay attention to which bricks you reach for first.', array['warmup','tactile'], 5, true, null),
      ('skill_building', 'Build your morning', 'Build a small scene that shows how your morning began today. Include one thing that felt easy and one that felt heavy. Two minutes to build, one minute to share.', array['warmup','storytelling'], 8, true, null),
      ('skill_building', 'Explain a brick', 'Choose a brick that catches your eye. Without naming its colour or shape, tell the person next to you what it could represent. Swap and repeat.', array['warmup','metaphor'], 6, true, null),
      ('skill_building', 'Metaphor warm-up', 'Pick three bricks. Combine them into one small object that stands for the word "trust". Share what each brick is doing in the metaphor.', array['warmup','metaphor'], 8, true, null),
      ('individual_model', 'Your role today', 'Build a model of the role you play in this team right now — not the title on the org chart, but what you actually do day to day. Include at least one thing you are proud of and one thing you find heavy.', array['identity','role'], 15, true, null),
      ('individual_model', 'Your ideal team', 'Build a model that shows what your team looks like at its best. What is present that is often missing? What is absent that you would like to remove?', array['vision','culture'], 20, true, null),
      ('individual_model', 'A win you are proud of', 'Build a small scene from a moment in the last quarter that you are proud of. Include the people, the obstacle, and the move that unlocked it.', array['reflection','wins'], 15, true, null),
      ('individual_model', 'A challenge you face', 'Build a model of a challenge you are sitting with right now. Show what is making it hard. Do not solve it yet — the goal is to put it on the table.', array['reflection','challenges'], 20, true, null),
      ('shared_model', 'Combine into one landscape', 'Bring your individual models into the centre. Rearrange them into one shared landscape that tells the group story. Negotiate placement out loud — no silent moves.', array['merge','co-create'], 30, true, null),
      ('shared_model', 'Find the common ground', 'Look at the individual models together. Which elements appear in more than one? Cluster them. The clusters become the foundations of the shared model.', array['merge','patterns'], 25, true, null),
      ('shared_model', 'Map the territory', 'Treat the table as the territory. Place each individual model where it belongs — centre, edge, inside, outside. Discuss what the geography is telling you.', array['merge','spatial'], 30, true, null),
      ('shared_model', 'Connect your contributions', 'Build short bridges between elements of different individual models that depend on each other. The bridges show how the work flows between you.', array['merge','dependencies'], 25, true, null),
      ('system_model', 'Show the forces', 'Look at the shared landscape. What forces push on it from outside the group? Build them in. Direction and weight matter — long sticks for pressure, short bricks for resistance.', array['systems','forces'], 25, true, null),
      ('system_model', 'Add the agents', 'Identify the people, teams, customers, or systems that act on the shared model. Place a figure for each one. Where do they sit relative to the work — close, distant, adversarial, supportive?', array['systems','stakeholders'], 25, true, null),
      ('system_model', 'Energy flows', 'Trace how energy moves through the system. Where does it come from? Where does it accumulate? Where does it leak away? Use connectors or directional bricks.', array['systems','flow'], 30, true, null),
      ('system_model', 'Tensions and supports', 'Find one place where two parts of the system pull against each other, and one place where two parts hold each other up. Build both clearly so the rest of the room can see them.', array['systems','tension'], 25, true, null),
      ('guiding_principles', 'Anchor a principle to each cluster', 'For every cluster on the system model, write a one-sentence principle that the group will hold when it acts on that part of the system. Anchor the sentence next to the cluster with a single brick.', array['principles','anchoring'], 30, true, null),
      ('guiding_principles', 'Phrase it as a behaviour', 'Take each draft principle and rephrase it as a behaviour. "We value transparency" becomes "We tell each other about decisions before they ship." Pin the behaviour next to its anchor brick.', array['principles','behaviour'], 25, true, null),
      ('guiding_principles', 'The principle test', 'Run each principle against the system model. Where would it have helped in the past month? Where would it have hurt? Keep the principle, sharpen it, or drop it.', array['principles','pressure-test'], 25, true, null),
      ('guiding_principles', 'Working agreement candidates', 'Choose the three principles you would be willing to sign as a working agreement starting tomorrow. Build a small model of each as a commitment, not an aspiration.', array['principles','commitment'], 30, true, null);
  end if;
end $$;
