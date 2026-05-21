'use client';

interface Props {
  isFacilitator: boolean;
}

export function SessionRoleChip({ isFacilitator }: Props) {
  if (isFacilitator) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white shadow-[0_1px_2px_rgba(76,29,149,0.25)]">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-violet-200" />
        Facilitator
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-teal-900">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal-600" />
      Participant
    </span>
  );
}
