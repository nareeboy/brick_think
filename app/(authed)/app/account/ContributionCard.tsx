const GITHUB_URL = 'https://github.com/nareeboy/brick_think';
const ISSUES_URL = `${GITHUB_URL}/issues`;

export function ContributionCard() {
  return (
    <section className="rounded-2xl border border-zinc-900/10 bg-white p-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Open source
        </p>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">Contribute</h2>
        <p className="text-[12px] text-zinc-500">
          BrickThink is Apache&nbsp;2.0 and built in the open. If it&rsquo;s useful, the easiest way
          to say thanks is to star the repo. Issues and pull requests are welcome.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-900/10 bg-[#FBF7F1] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-zinc-900">
              nareeboy/brick_think
            </span>
            <span className="inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
              Apache 2.0
            </span>
          </div>
          <p className="mt-1 text-[12px] text-zinc-500">
            Next.js, Supabase, Yjs, Konva — the entire stack is on GitHub.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#c0613d] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
          >
            <GitHubGlyph className="h-3.5 w-3.5" />
            Star on GitHub
          </a>
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/15 bg-white px-3 text-[12px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5"
          >
            Report an issue
          </a>
        </div>
      </div>
    </section>
  );
}

function GitHubGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.236 1.839 1.236 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.103.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"
      />
    </svg>
  );
}
