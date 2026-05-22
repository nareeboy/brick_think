import { notFound } from 'next/navigation';

import { getArticleByIdForAdmin } from '@/lib/articles/queries';

import { ArticleEditor } from '../ArticleEditor';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const article = await getArticleByIdForAdmin(id);
  return { title: `${article?.title ?? 'Article'} · Admin · BrickThink` };
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const article = await getArticleByIdForAdmin(id);
  if (!article) notFound();
  return <ArticleEditor mode="edit" article={article} />;
}
