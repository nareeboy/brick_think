import { describe, expect, test } from 'vitest';

import {
  ASSISTANT_TOOL_NAMES,
  ASSISTANT_TOOL_SCHEMAS,
  ASSISTANT_TOOL_VERB_PREFIXES,
  GATED_ASSISTANT_TOOLS,
} from './contract';

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

  test('every schema is strict-mode compatible', () => {
    // strict: true on the Anthropic side requires both of these, or the API
    // rejects the tool definition.
    for (const name of ASSISTANT_TOOL_NAMES) {
      const schema = ASSISTANT_TOOL_SCHEMAS[name];
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      expect(Array.isArray(schema.required)).toBe(true);
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
});
