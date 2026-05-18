export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export type ExportExtension = 'png' | 'svg' | 'brickthink.json';

export function buildExportFilename(title: string, ext: ExportExtension): string {
  const slug = slugify(title) || 'design';
  return `${slug}.${ext}`;
}
