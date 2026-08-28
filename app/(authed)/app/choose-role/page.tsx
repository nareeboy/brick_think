import { redirect } from 'next/navigation';

/**
 * The old first-run role question. Replaced by the five-step configuration
 * flow at /app/welcome — this route only survives so old links keep working.
 */
export default function ChooseRolePage() {
  redirect('/app/welcome');
}
