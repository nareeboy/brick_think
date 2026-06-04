export function RoleStatusPill({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
        isOpen ? 'bg-green-500/10 text-green-700' : 'bg-zinc-500/10 text-zinc-600'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-green-600' : 'bg-zinc-500'}`} />
      {isOpen ? 'Open' : 'Closed'}
    </span>
  );
}
