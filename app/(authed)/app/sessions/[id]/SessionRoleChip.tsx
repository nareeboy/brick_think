'use client';

interface Props {
  isFacilitator: boolean;
}

export function SessionRoleChip({ isFacilitator }: Props) {
  const label = isFacilitator ? 'Facilitator' : 'Participant';

  return (
    <span className="inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
      {label}
    </span>
  );
}
