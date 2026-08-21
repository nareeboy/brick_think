import { describe, expect, test } from 'vitest';

import { ASSISTANT_TOOL_NAMES, ASSISTANT_TOOL_SCHEMAS, GATED_ASSISTANT_TOOLS } from './contract';

describe('assistant tool contract', () => {
  test('every tool name has a schema', () => {
    expect(ASSISTANT_TOOL_NAMES.length).toBeGreaterThan(0);
    for (const name of ASSISTANT_TOOL_NAMES) {
      expect(ASSISTANT_TOOL_SCHEMAS[name]).toBeDefined();
    }
  });

  test('no delete or remove tool exists', () => {
    // Structural safety guarantee from the design: the agent has no reachable
    // path to destroying a workshop, session, model or membership. Safety is
    // by absence, not by confirmation dialog. If someone adds such a tool
    // later, this test is the tripwire.
    for (const name of ASSISTANT_TOOL_NAMES) {
      expect(name).not.toMatch(/delete|remove|destroy|archive/);
    }
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
