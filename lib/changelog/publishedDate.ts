// lib/changelog/publishedDate.ts
// The published-date validation + noon-UTC instant conversion is identical to
// the articles CMS; reuse it directly rather than copy.
export { isValidPublishedDateInput, publishedDateToInstant } from '@/lib/articles/publishedDate';
