import { RoleEditor } from '../RoleEditor';

export const dynamic = 'force-dynamic';

export default function NewRolePage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-zinc-950">New role</h1>
      <RoleEditor mode="create" />
    </div>
  );
}
