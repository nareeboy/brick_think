import { describe, expect, test } from 'vitest';

import {
  ASSISTANT_TOOL_NAMES,
  ASSISTANT_TOOL_SCHEMAS,
  ASSISTANT_TOOL_VERB_PREFIXES,
  GATED_ASSISTANT_TOOLS,
} from './contract';
import { MAX_SLUG_LENGTH, MIN_SLUG_LENGTH } from '@/lib/orgs/slug';

describe('assistant tool contract', () => {
  test('every tool name has a schema', () => {
    expect(ASSISTANT_TOOL_NAMES.length).toBeGreaterThan(0);
    for (const name of ASSISTANT_TOOL_NAMES) {
      expect(ASSISTANT_TOOL_SCHEMAS[name]).toBeDefined();
    }
  });

  test('every tool name declares a known-safe verb prefix', () => {
    // Primary safety guarantee, structural rather than a confirmation
    // dialog: this is an ALLOWLIST, not a blacklist. Every tool name must
    // start with one of ASSISTANT_TOOL_VERB_PREFIXES — verbs already vetted
    // as non-destructive. A blacklist of banned substrings alone only
    // rejects a handful of specific words and passes everything else; a
    // future tool named e.g. `clear_workshop`, `revoke_membership`,
    // `kick_participant`, `wipe_session` or `reset_stage` would sail
    // through a substring check while doing exactly what this contract
    // forbids. If a new tool genuinely needs a new, genuinely safe verb,
    // add it to ASSISTANT_TOOL_VERB_PREFIXES in contract.ts deliberately —
    // that added friction, and the re-justification it forces, is the
    // point of this test.
    const unrecognizedVerb = ASSISTANT_TOOL_NAMES.filter(
      (name) => !ASSISTANT_TOOL_VERB_PREFIXES.some((prefix) => name.startsWith(prefix)),
    );
    expect(
      unrecognizedVerb,
      `these tool names do not start with any prefix in ASSISTANT_TOOL_VERB_PREFIXES: ` +
        `${JSON.stringify(unrecognizedVerb)}. Either add the new, vetted-safe verb to ` +
        `ASSISTANT_TOOL_VERB_PREFIXES in contract.ts, or this tool should not exist.`,
    ).toEqual([]);
  });

  test('no tool name contains a destructive-sounding substring', () => {
    // Second line of defence, not the primary guarantee (see the prefix
    // allowlist test above). Catches a name that satisfies the prefix rule
    // but still signals destructive intent elsewhere in the name, e.g.
    // `create_deletion_request`.
    const destructiveSounding = ASSISTANT_TOOL_NAMES.filter((name) =>
      /delete|remove|destroy|archive/.test(name),
    );
    expect(
      destructiveSounding,
      `these tool names contain a destructive-sounding substring even though they start with ` +
        `an approved verb: ${JSON.stringify(destructiveSounding)}. Rename them.`,
    ).toEqual([]);
  });

  test('every schema declares what strict mode actually requires', () => {
    // strict: true on the Anthropic side requires all three of these, or the
    // API rejects the tool definition. This is also the full extent of what
    // strict mode guarantees about a tool call's input — the property set
    // and required-ness. String minLength/maxLength are accepted by the API
    // but not enforced, so those stay as advisory hints in the schemas
    // above, not assertions this test can make about enforcement.
    for (const name of ASSISTANT_TOOL_NAMES) {
      const schema = ASSISTANT_TOOL_SCHEMAS[name];
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      expect(Array.isArray(schema.required)).toBe(true);
    }
  });

  test('no array property carries minItems/maxItems', () => {
    // The live API rejects the whole request with a 400
    // ("For 'array' type, property 'maxItems' is not supported") when a
    // strict tool schema bounds an array — which broke every real assistant
    // turn while the stubbed model kept tests green. Caps belong in the
    // property description and in the service that enforces them.
    for (const name of ASSISTANT_TOOL_NAMES) {
      const schema = ASSISTANT_TOOL_SCHEMAS[name];
      for (const [key, prop] of Object.entries<Record<string, unknown>>(schema.properties)) {
        if (prop.type === 'array') {
          expect(prop.minItems, `${name}.${key}.minItems`).toBeUndefined();
          expect(prop.maxItems, `${name}.${key}.maxItems`).toBeUndefined();
        }
      }
    }
  });

  test('every required key is declared in properties', () => {
    for (const name of ASSISTANT_TOOL_NAMES) {
      const schema = ASSISTANT_TOOL_SCHEMAS[name];
      for (const key of schema.required) {
        expect(Object.keys(schema.properties)).toContain(key);
      }
    }
  });

  test('outward-facing tools are gated, constructive ones are not', () => {
    expect(GATED_ASSISTANT_TOOLS.has('invite_participants')).toBe(true);
    expect(GATED_ASSISTANT_TOOLS.has('add_workshop_member')).toBe(true);
    expect(GATED_ASSISTANT_TOOLS.has('create_workshop')).toBe(false);
    expect(GATED_ASSISTANT_TOOLS.has('update_stage')).toBe(false);
  });

  test('every gated tool is a real tool', () => {
    for (const name of GATED_ASSISTANT_TOOLS) {
      expect(ASSISTANT_TOOL_NAMES).toContain(name);
    }
  });

  describe('constants drift', () => {
    // These bounds are hand-copied into the schemas above (see the header
    // comment on why the contract cannot import the services it mirrors).
    // Without this test, the three numbers below can drift silently the
    // moment the real constant changes; with it, drift is one CI failure.

    test('create_workshop.slug bounds track lib/orgs/slug (isValidSlug)', () => {
      const { slug } = ASSISTANT_TOOL_SCHEMAS.create_workshop.properties;
      expect(slug.minLength).toBe(MIN_SLUG_LENGTH);
      expect(slug.maxLength).toBe(MAX_SLUG_LENGTH);
    });

    test('invite_participants.emails description tracks INVITE_CAP', () => {
      // INVITE_CAP lives in app/(authed)/app/sessions/roster-actions.ts, a
      // 'use server' action module, and is not exported — importing it here
      // would drag a server-action module into a unit test for no benefit.
      // Asserted against the literal instead; keep this constant (currently
      // 25) in sync with INVITE_CAP by hand if that module ever changes.
      // The cap rides in the property description (not minItems/maxItems —
      // see the array-bounds test above): the model reads it as guidance,
      // the service enforces it.
      const INVITE_CAP = 25;
      const { emails } = ASSISTANT_TOOL_SCHEMAS.invite_participants.properties;
      expect(emails.description).toContain(String(INVITE_CAP));
    });
  });
});
