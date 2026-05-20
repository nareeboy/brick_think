import type Anthropic from '@anthropic-ai/sdk';

import type { CollectedSession } from '@/lib/reports/collect';

const SYNTHESIS_TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT = `You are writing a session report for BrickThink, a facilitation tool for LEGO Serious Play sessions. Voice: confident, plain English, no jargon, no marketing fluff. Reference participants by first name. Never invent details that aren't in the input. Use British English.

Output exactly one JSON object matching this schema:
{
  "exec_summary": string (2-3 paragraphs separated by \\n\\n synthesising the session's arc),
  "model_descriptions": { [model_id: string]: string (one paragraph per model describing what it represents and notable themes from any extracted text) },
  "closing": string (1-2 paragraphs synthesising the guiding_principles stage if any models exist for it, plus 2-3 concrete next steps. If no guiding_principles models exist, return a short reflection on shared_model + system_model themes.)
}

Return JSON only, no prose around it.`;

export interface Synthesis {
  execSummary: string;
  modelDescriptions: Record<string, string>;
  closing: string;
}

export async function synthesizeReport(
  client: Anthropic,
  collected: CollectedSession,
): Promise<Synthesis> {
  const userBlock = buildUserBlock(collected);

  const resp = await client.messages.create(
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userBlock }],
    },
    { timeout: SYNTHESIS_TIMEOUT_MS },
  );

  const block = resp.content.find((c) => c.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text content');
  }
  const raw = block.text.trim();
  const json = extractJson(raw);
  return parseSynthesis(json);
}

function buildUserBlock(s: CollectedSession): string {
  const lines: string[] = [
    `Session: ${s.sessionTitle}`,
    `Date: ${s.date}`,
    `Facilitator: ${s.facilitatorName}`,
    `Stages that ran: ${[...s.modelsByStage.keys()].join(', ')}`,
    '',
    'Models:',
  ];
  for (const [stage, models] of s.modelsByStage) {
    for (const m of models) {
      lines.push(`  [${stage}] ${m.ownerLabel} — "${m.title}" (id: ${m.id})`);
      if (m.extractedText) {
        lines.push(`    Text from canvas: ${m.extractedText}`);
      }
    }
  }
  return lines.join('\n');
}

function extractJson(raw: string): unknown {
  // Tolerate accidental code fences.
  const stripped = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(stripped);
}

function parseSynthesis(value: unknown): Synthesis {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Claude JSON: not an object');
  }
  const v = value as Record<string, unknown>;
  if (typeof v.exec_summary !== 'string') throw new Error('Claude JSON: missing exec_summary');
  if (typeof v.closing !== 'string') throw new Error('Claude JSON: missing closing');
  if (typeof v.model_descriptions !== 'object' || v.model_descriptions === null) {
    throw new Error('Claude JSON: missing model_descriptions');
  }
  const descs = v.model_descriptions as Record<string, unknown>;
  const cleaned: Record<string, string> = {};
  for (const [k, val] of Object.entries(descs)) {
    if (typeof val === 'string') cleaned[k] = val;
  }
  return {
    execSummary: v.exec_summary,
    modelDescriptions: cleaned,
    closing: v.closing,
  };
}
