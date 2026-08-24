/**
 * The AI setup assistant's tool contract.
 *
 * This file is the boundary between open core and the premium agent. It
 * declares WHAT the assistant may do; `../brick_think-premium` declares HOW
 * (the Claude loop, the prompts, the streaming, the entitlement check). It
 * deliberately imports nothing from Anthropic — the contract stays usable,
 * testable and reviewable in the open repository.
 *
 * It lives beside the services it mirrors (lib/workshops/service.ts,
 * lib/sessions/service.ts) by convention, not by import — this file imports
 * nothing from them, and nothing but its own test imports this file, so
 * renaming or reshaping a mirrored service does not fail the build here.
 * `contract.test.ts` carries a constants-drift test (slug bounds, invite cap)
 * as the real protection against the numbers below going stale; Phase 2's
 * binding layer is where a compile-time link to the services will live.
 *
 * Shapes are JSON Schema because that is exactly what the Anthropic tool API
 * takes as `input_schema`. `additionalProperties: false` plus an explicit
 * `required` array are mandatory for `strict: true` — and they are also *all*
 * that strict mode actually guarantees: the property set and required-ness
 * of a tool call's input. String `minLength`/`maxLength` are accepted by the
 * API but not enforced — advisory hints for a human reader, not enforcement.
 * Array bounds (`minItems`/`maxItems`) are REJECTED outright: the live API
 * 400s the whole request ("For 'array' type, property 'maxItems' is not
 * supported"), so item caps ride in property descriptions instead. The real
 * length checks happen in the services themselves.
 */

import { MAX_SLUG_LENGTH, MIN_SLUG_LENGTH } from '@/lib/orgs/slug';

export interface AssistantToolSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
}

// Deliberately NOT derived from `UUID_RE` in lib/db/uuid.ts (e.g. via
// `UUID_RE.source`). `UUID_RE` is a JS RegExp that relies on the `i` flag for
// case-insensitivity; a JSON Schema `pattern` string carries no flags, so a
// pattern built from `UUID_RE.source` alone would only match lowercase hex
// and silently reject valid uppercase UUIDs. This pattern spells out the
// `[0-9a-fA-F]` character class explicitly instead. The two definitions are
// intentionally duplicated — do not "DRY" them back together.
const UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

// `format: 'uuid'` is the mechanism `strict: true` actually honours for
// constraining an id; `pattern` is not. Keep both: format is enforced by the
// API, and pattern stays as a human-readable statement of intent (see the
// comment on UUID_PATTERN above — it is deliberately not derived from
// UUID_RE.source).
const uuidProp = (description: string) => ({
  type: 'string' as const,
  format: 'uuid' as const,
  pattern: UUID_PATTERN,
  description,
});

export const ASSISTANT_TOOL_SCHEMAS = {
  /** Opening move — workshop, first session and its five stages, atomically. */
  create_workshop: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 80, description: 'Workshop name.' },
      slug: {
        type: 'string',
        minLength: MIN_SLUG_LENGTH,
        maxLength: MAX_SLUG_LENGTH,
        description: 'URL slug: lowercase letters, digits and hyphens.',
      },
      sessionTitle: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Title of the first session inside the workshop.',
      },
    },
    required: ['name', 'slug', 'sessionTitle'],
    additionalProperties: false,
  },
  rename_workshop: {
    type: 'object',
    properties: {
      orgId: uuidProp('The workshop to rename.'),
      name: { type: 'string', minLength: 1, maxLength: 80 },
    },
    required: ['orgId', 'name'],
    additionalProperties: false,
  },
  create_session: {
    type: 'object',
    properties: {
      orgId: uuidProp('Workshop the session belongs to.'),
      title: { type: 'string', minLength: 1, maxLength: 200 },
    },
    required: ['orgId', 'title'],
    additionalProperties: false,
  },
  rename_session: {
    type: 'object',
    properties: {
      sessionId: uuidProp('The session to rename.'),
      title: { type: 'string', minLength: 1, maxLength: 200 },
    },
    required: ['sessionId', 'title'],
    additionalProperties: false,
  },
  set_session_brief: {
    type: 'object',
    properties: {
      sessionId: uuidProp('The session to describe.'),
      brief: {
        type: 'string',
        maxLength: 4000,
        description: "The facilitator's brief for the session.",
      },
    },
    required: ['sessionId', 'brief'],
    additionalProperties: false,
  },
  update_stage: {
    type: 'object',
    properties: {
      stageId: uuidProp('The stage to edit.'),
      title: { type: ['string', 'null'], maxLength: 200 },
      description: { type: ['string', 'null'], maxLength: 500 },
    },
    required: ['stageId', 'title', 'description'],
    additionalProperties: false,
  },
  set_stage_scenario: {
    type: 'object',
    properties: {
      stageId: uuidProp('The stage to attach a scenario to.'),
      scenarioId: uuidProp('Id from list_scenarios.'),
    },
    required: ['stageId', 'scenarioId'],
    additionalProperties: false,
  },
  /**
   * Read-only: the scenario catalogue the agent may choose from.
   *
   * No Phase 1 implementation anywhere in this branch or any existing
   * action — Phase 2 must supply the query. `scenarios` is an org-scoped
   * table, so the implementation must filter to the caller's org, not
   * return every scenario in the database.
   */
  list_scenarios: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  /**
   * Read-only: current workshop shape, so the agent stays grounded in
   * reality after each tool call (the design depends on this to re-derive
   * the live build preview).
   *
   * No Phase 1 implementation anywhere in this branch or any existing
   * action — Phase 2 must supply the query.
   */
  get_workshop_state: {
    type: 'object',
    properties: { orgId: uuidProp('Workshop to describe.') },
    required: ['orgId'],
    additionalProperties: false,
  },
  invite_participants: {
    type: 'object',
    properties: {
      sessionId: uuidProp('Session to invite people to.'),
      emails: {
        type: 'array',
        items: { type: 'string', format: 'email' },
        // No minItems/maxItems: the live API 400s on array bounds in strict
        // tool schemas (see the header comment). The cap must track
        // INVITE_CAP in app/(authed)/app/sessions/roster-actions.ts
        // (currently 25). Not exported, so not importable here — see the
        // drift test in contract.test.ts, which asserts against the same
        // literal.
        description: 'Email addresses to invite: at least 1, at most 25 per call.',
      },
    },
    required: ['sessionId', 'emails'],
    additionalProperties: false,
  },
  add_workshop_member: {
    type: 'object',
    properties: {
      orgId: uuidProp('Workshop to add a co-facilitator to.'),
      email: { type: 'string', format: 'email' },
    },
    required: ['orgId', 'email'],
    additionalProperties: false,
  },
} satisfies Record<string, AssistantToolSchema>;

export type AssistantToolName = keyof typeof ASSISTANT_TOOL_SCHEMAS;

export const ASSISTANT_TOOL_NAMES = Object.freeze(
  Object.keys(ASSISTANT_TOOL_SCHEMAS),
) as readonly AssistantToolName[];

/**
 * Tools that email a human being. The agent loop must halt on these and wait
 * for an explicit confirmation carrying the exact recipient list — mail to a
 * third party is not reversible, and it is the one irreversible thing the
 * assistant can do (there are no delete tools at all).
 */
export const GATED_ASSISTANT_TOOLS: ReadonlySet<AssistantToolName> = new Set<AssistantToolName>([
  'invite_participants',
  'add_workshop_member',
]);

/**
 * Verb-family prefixes every tool name in this contract is allowed to start
 * with. This is the source of truth for "what class of action can a tool
 * declare" — safety here is structural (there is no delete/remove/destroy/
 * archive tool anywhere in this file), not a confirmation dialog bolted onto
 * a dangerous one, so the set of verbs a tool name may open with is itself
 * part of the contract, not merely a test-time convention.
 *
 * `contract.test.ts` enforces this as an ALLOWLIST: every tool name must
 * start with one of these prefixes, so an unrecognised (and potentially
 * destructive) verb fails loudly instead of merely dodging a handful of
 * banned words. When a future tool needs a genuinely new and genuinely safe
 * verb, add it here deliberately and re-justify why it cannot reach anything
 * destructive — that friction is the point.
 */
export const ASSISTANT_TOOL_VERB_PREFIXES = [
  'create_',
  'rename_',
  'set_',
  'update_',
  'list_',
  'get_',
  'invite_',
  'add_',
] as const;
