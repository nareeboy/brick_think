/**
 * Renders a JSON-LD structured-data block. The payload is server-built and
 * trusted (no user-controlled keys), so dangerouslySetInnerHTML is safe here;
 * we still escape "<" to avoid any chance of breaking out of the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
