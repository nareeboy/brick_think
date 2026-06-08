import Anthropic from '@anthropic-ai/sdk';

export type ServerAnthropicResult =
  | { ok: true; client: Anthropic }
  | { ok: false; code: 'no_claude_key' };

/**
 * Anthropic client backed by the single server-side ANTHROPIC_API_KEY. This is
 * the key source for the paid features (PDF report, narration cleanup): on the
 * hosted instance BrickThink pays the tokens (recovered by the subscription);
 * self-hosters set their own ANTHROPIC_API_KEY. Returns no_claude_key when the
 * env var is unset so callers degrade gracefully. Server-only env — never NEXT_PUBLIC_.
 */
export function getServerAnthropicClient(): ServerAnthropicResult {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.length === 0) return { ok: false, code: 'no_claude_key' };
  return { ok: true, client: new Anthropic({ apiKey }) };
}
