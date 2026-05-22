import { ArticleEditor } from '../ArticleEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New article · Admin · BrickThink' };

export default function NewArticlePage() {
  return <ArticleEditor mode="new" />;
}
