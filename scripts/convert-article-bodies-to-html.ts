// scripts/convert-article-bodies-to-html.ts
// One-time, idempotent: converts any article whose body is still Markdown
// into sanitized HTML. Safe to re-run — already-HTML rows are skipped (detected
// via looksLikeArticleHtml, which requires a real block-level opening tag so
// Markdown that starts with a stray '<' such as "<3 great ideas" is correctly
// converted rather than skipped). Run once per environment AFTER the rename migration.
// LOCAL example (never point this at prod casually):
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=<local service_role key> \
//   pnpm exec tsx scripts/convert-article-bodies-to-html.ts
import ws from 'ws';

import { createClient } from '@supabase/supabase-js';

import { looksLikeArticleHtml, renderArticleMarkdown } from '../lib/articles/markdown';
import { sanitizeArticleHtml } from '../lib/articles/sanitizeHtml';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Echo the target so the operator can confirm prod vs non-prod before any write.
// eslint-disable-next-line no-console -- intentional status output for a manually-run build script
console.log(`Target database: ${url}`);

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  // ws transport: required on Node < 22 which lacks native WebSocket.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ws type signature differs from WebSocketLikeConstructor
  realtime: { transport: ws as any },
});

async function main() {
  const { data, error } = await db.from('articles').select('id, slug, body_html');
  if (error) throw error;

  let converted = 0;
  let failed = 0;
  for (const row of data ?? []) {
    const body = (row.body_html ?? '') as string;
    if (looksLikeArticleHtml(body)) continue; // already HTML
    try {
      const html = sanitizeArticleHtml(renderArticleMarkdown(body));
      const { error: upErr } = await db
        .from('articles')
        .update({ body_html: html })
        .eq('id', row.id);
      if (upErr) throw upErr;
      converted++;
      // eslint-disable-next-line no-console -- intentional status output for a manually-run build script
      console.log(`converted: ${row.slug}`);
    } catch (e) {
      failed++;
      console.error(`FAILED: ${row.slug}`, e);
    }
  }
  // eslint-disable-next-line no-console -- intentional status output for a manually-run build script
  console.log(`done. converted=${converted} failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  const e = (err ?? {}) as { message?: string; details?: string; hint?: string; code?: string };
  console.error(
    [
      `Conversion failed: ${e.message ?? String(err)}`,
      e.code ? `  code: ${e.code}` : '',
      e.details ? `  details: ${e.details}` : '',
      e.hint ? `  hint: ${e.hint}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  process.exit(1);
});
