import type Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT =
  'You clean up raw speech-to-text transcripts. Add sentence casing, punctuation, ' +
  'and paragraph breaks to make the text readable. Do NOT add, remove, summarise, ' +
  "translate, or reinterpret content — preserve the speaker's exact words and meaning. " +
  'Return only the cleaned transcript, with no preamble or commentary.';

export type CleanupResult = { ok: true; text: string } | { ok: false };

export async function cleanupTranscript(client: Anthropic, raw: string): Promise<CleanupResult> {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: raw }],
    });
    const block = res.content.find((b) => b.type === 'text');
    const text =
      block && 'text' in block ? (block as { type: 'text'; text: string }).text.trim() : '';
    if (!text) return { ok: false };
    return { ok: true, text };
  } catch {
    return { ok: false };
  }
}
