interface UserBarProps {
  email?: string | null;
}

export function UserBar({ email }: UserBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-zinc-700">
      {email ? (
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-zinc-500 sm:inline" data-testid="current-user-email">
            {email}
          </span>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              data-testid="sign-out-button"
              className="cursor-pointer rounded-full border border-zinc-900/10 bg-white px-3 py-1 font-medium text-zinc-800 transition-colors hover:bg-zinc-900/5"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Preview · not signed in
        </span>
      )}
    </div>
  );
}

export function BrickGlyph() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#c0613d] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/20" />
      <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-black/20" />
    </span>
  );
}
