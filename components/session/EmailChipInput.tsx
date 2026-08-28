'use client';

/**
 * The email chip-list input shared by the roster invite block and the
 * onboarding configuration flow. Fully controlled: the parent owns both the
 * committed chips and the uncommitted draft text. Enter / comma / space
 * commit the draft (pasted text splits on commas and newlines), Backspace on
 * an empty draft pops the last chip.
 */

interface Props {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name for the input. */
  label?: string;
}

/**
 * Splits an uncommitted draft into addable entries (trimmed, deduplicated
 * against the existing chips). A typed-but-uncommitted address still counts
 * when the parent acts on the list — flush the draft through this first.
 */
export function splitEmailDraft(input: string, existing: string[]): string[] {
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((c) => c && !existing.includes(c));
}

export function EmailChipInput({
  emails,
  onEmailsChange,
  inputValue,
  onInputValueChange,
  placeholder = 'Enter email addresses...',
  label = 'Email addresses',
}: Props) {
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      const newEmails = splitEmailDraft(inputValue, emails);
      if (newEmails.length > 0) {
        onEmailsChange([...emails, ...newEmails]);
        onInputValueChange('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      e.preventDefault();
      onEmailsChange(emails.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-9 flex-wrap gap-2 rounded-lg border border-zinc-900/10 bg-white p-2">
      {emails.map((email) => (
        <div
          key={email}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-900/5 px-2 py-1 font-mono text-[11px] text-zinc-700"
        >
          <span>{email}</span>
          <button
            type="button"
            onClick={() => onEmailsChange(emails.filter((e) => e !== email))}
            aria-label={`Remove ${email}`}
            className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded hover:bg-zinc-900/10"
          >
            ×
          </button>
        </div>
      ))}
      <input
        type="email"
        value={inputValue}
        onChange={(e) => onInputValueChange(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={emails.length === 0 ? placeholder : ''}
        aria-label={label}
        className="flex-1 bg-white px-2 py-1 font-mono text-[12px] text-zinc-900 placeholder:text-zinc-500 focus:outline-none"
        autoComplete="off"
      />
    </div>
  );
}
