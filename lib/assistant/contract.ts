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
 * lib/sessions/service.ts) so that changing a service signature breaks this
 * file in the same repo and the same CI run.
 *
 * Shapes are JSON Schema because that is exactly what the Anthropic tool API
 * takes as `input_schema`. `additionalProperties: false` plus an explicit
 * `required` array are mandatory for `strict: true`, which is what guarantees
 * tool inputs match these shapes at all.
 */

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

const uuidProp = (description: string) => ({
  type: 'string' as const,
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
        minLength: 1,
        maxLength: 80,
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
      scenarioId: { type: 'string', minLength: 1, description: 'Id from list_scenarios.' },
    },
    required: ['stageId', 'scenarioId'],
    additionalProperties: false,
  },
  /** Read-only: the scenario catalogue the agent may choose from. */
  list_scenarios: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  /** Read-only: current workshop shape, so the agent stays grounded in reality. */
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
        minItems: 1,
        maxItems: 50,
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

export const ASSISTANT_TOOL_NAMES = Object.keys(
  ASSISTANT_TOOL_SCHEMAS,
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
