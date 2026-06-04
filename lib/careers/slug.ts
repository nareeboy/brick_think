// lib/careers/slug.ts
// Roles use the same slug rules as articles. Re-export so careers code has a
// local import surface and the dependency is explicit.
export { isValidSlug, slugify } from '@/lib/articles/slug';
