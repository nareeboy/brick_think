'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import {
  BRAND_FONT_MAX_BYTES,
  BRAND_LOGO_MAX_BYTES,
  type BrandProfileSummary,
  type FontChoice,
} from '@/lib/branding/types';
import { isValidHexColour } from '@/lib/branding/validate';

import {
  type BrandActionResult,
  createBrandProfileAction,
  updateBrandProfileAction,
  uploadBrandFontAction,
  uploadBrandLogoAction,
} from './actions';
import { ColourField } from './ColourField';
import { LiveBrandPreview } from './LiveBrandPreview';

type FontOption = { key: string; label: string };

interface Props {
  existing: BrandProfileSummary | null;
  fontOptions: FontOption[];
  onClose: () => void;
  /** Receives the id of the saved preset so callers can auto-select it. */
  onSaved: (savedId: string) => void;
}

// Maps a non-ok action result code to human copy (mirrors the articles editor
// CODE_MESSAGES pattern). Errors render inline; the modal never closes on error.
const CODE_MESSAGES: Record<Exclude<BrandActionResult, { ok: true }>['code'], string> = {
  unauthenticated: 'Your session expired. Please sign in again.',
  invalid_name: 'Give this preset a name (up to 80 characters).',
  invalid_display_name: 'Add the brand name to show on reports (up to 80 characters).',
  invalid_footer: 'The footer contact is too long (up to 160 characters).',
  invalid_colour: 'One of the colours is not a valid hex value.',
  invalid_font: 'Pick a valid font for both heading and body.',
  limit_reached: 'You have reached the maximum number of brand presets.',
  not_found: 'That preset could not be found. It may have been deleted.',
  invalid_logo: 'The logo must be a PNG no larger than 2 MB.',
  invalid_font_file: 'The font must be a .ttf file no larger than 2 MB.',
  storage_failed: 'Uploading an asset failed. Please try again.',
  db_failed: 'Could not save the preset. Please try again.',
};

const DEFAULT_BRAND = '#1f1f1f';
const DEFAULT_ACCENT = '#1d4ed8';

// Sentinel <select> value representing an active custom (uploaded) font. Cannot
// collide with a curated key (which is a plain font slug).
const CUSTOM_FONT_VALUE = '__custom__';

export function BrandProfileEditor({ existing, fontOptions, onClose, onSaved }: Props) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultKey = fontOptions[0]?.key ?? '';

  const [name, setName] = useState(existing?.name ?? '');
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [footerContact, setFooterContact] = useState(existing?.footerContact ?? '');
  const [brandColour, setBrandColour] = useState(existing?.brandColour ?? DEFAULT_BRAND);
  const [accentColour, setAccentColour] = useState(existing?.accentColour ?? DEFAULT_ACCENT);

  // Each role's font is a full FontChoice so an existing custom binding survives
  // an edit that doesn't re-upload. Seeded from the existing preset; a new preset
  // defaults to the first curated option.
  const [headingFont, setHeadingFont] = useState<FontChoice>(
    existing?.headingFont ?? { kind: 'curated', key: defaultKey },
  );
  const [bodyFont, setBodyFont] = useState<FontChoice>(
    existing?.bodyFont ?? { kind: 'curated', key: defaultKey },
  );

  const [headingFile, setHeadingFile] = useState<File | null>(null);
  const [bodyFile, setBodyFile] = useState<File | null>(null);
  const [headingRights, setHeadingRights] = useState(false);
  const [bodyRights, setBodyRights] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(existing?.logoUrl ?? null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Object-URL preview for a freshly picked logo; revoke on change/unmount.
  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function pickLogo(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.type !== 'image/png') {
      setError('The logo must be a PNG image.');
      return;
    }
    if (file.size > BRAND_LOGO_MAX_BYTES) {
      setError('The logo must be 2 MB or smaller.');
      return;
    }
    setLogoFile(file);
  }

  function pickFont(role: 'heading' | 'body', file: File | undefined) {
    setError(null);
    if (!file) {
      if (role === 'heading') setHeadingFile(null);
      else setBodyFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.ttf')) {
      setError('Custom fonts must be a .ttf file.');
      return;
    }
    if (file.size > BRAND_FONT_MAX_BYTES) {
      setError('The font must be 2 MB or smaller.');
      return;
    }
    if (role === 'heading') setHeadingFile(file);
    else setBodyFile(file);
  }

  const coloursValid = isValidHexColour(brandColour) && isValidHexColour(accentColour);
  const nameValid = name.trim().length > 0;
  const displayValid = displayName.trim().length > 0;
  const fontRightsOk = (!headingFile || headingRights) && (!bodyFile || bodyRights);
  const canSubmit = coloursValid && nameValid && displayValid && fontRightsOk && !pending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const input = {
      name: name.trim(),
      displayName: displayName.trim(),
      footerContact: footerContact.trim() || null,
      brandColour,
      accentColour,
      // Pass the current FontChoice verbatim. An untouched custom binding is
      // preserved (submitted as { kind: 'custom', path }); a curated pick is
      // submitted as curated. Custom-font uploads (below) overwrite the role's
      // font server-side after the row exists.
      headingFont,
      bodyFont,
    };

    startTransition(async () => {
      const saved = existing
        ? await updateBrandProfileAction(existing.id, input)
        : await createBrandProfileAction(input);
      if (!saved.ok) {
        setError(CODE_MESSAGES[saved.code]);
        return;
      }

      const id = saved.id;

      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile, 'logo.png');
        const up = await uploadBrandLogoAction(id, fd);
        if (!up.ok) {
          setError(CODE_MESSAGES[up.code]);
          return;
        }
      }

      for (const [role, file] of [
        ['heading', headingFile],
        ['body', bodyFile],
      ] as const) {
        if (!file) continue;
        const fd = new FormData();
        fd.append('font', file, file.name);
        const up = await uploadBrandFontAction(id, role, fd);
        if (!up.ok) {
          setError(CODE_MESSAGES[up.code]);
          return;
        }
      }

      onSaved(id);
    });
  }

  return (
    <ModalBackdrop
      onClose={pending ? () => {} : onClose}
      ariaLabel={existing ? 'Edit brand preset' : 'Add brand preset'}
      panelClassName="w-full max-w-2xl"
      dataTestid="brand-profile-editor"
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
      >
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {existing ? 'Edit brand preset' : 'Add brand preset'}
        </h2>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Field label="Preset name" htmlFor="brand-name">
              <input
                ref={firstFieldRef}
                id="brand-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Consulting"
                className="h-9 w-full rounded-lg border border-zinc-300 px-2 text-[13px] text-zinc-900 focus:border-[#a8482a] focus:outline-none"
              />
            </Field>

            <Field label="Brand name (shown on reports)" htmlFor="brand-display">
              <input
                id="brand-display"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Acme Consulting Ltd"
                className="h-9 w-full rounded-lg border border-zinc-300 px-2 text-[13px] text-zinc-900 focus:border-[#a8482a] focus:outline-none"
              />
            </Field>

            <Field label="Footer contact (optional)" htmlFor="brand-footer">
              <input
                id="brand-footer"
                type="text"
                value={footerContact}
                onChange={(e) => setFooterContact(e.target.value)}
                placeholder="hello@acme.com · acme.com"
                className="h-9 w-full rounded-lg border border-zinc-300 px-2 text-[13px] text-zinc-900 focus:border-[#a8482a] focus:outline-none"
              />
            </Field>

            <ColourField label="Brand colour" value={brandColour} onChange={setBrandColour} />
            <ColourField label="Accent colour" value={accentColour} onChange={setAccentColour} />
          </div>

          <div className="flex flex-col gap-4">
            <FontSelector
              label="Heading font"
              fontRole="heading"
              options={fontOptions}
              choice={headingFont}
              onSelectCurated={(key) => setHeadingFont({ kind: 'curated', key })}
              file={headingFile}
              onPickFile={(f) => pickFont('heading', f)}
              rights={headingRights}
              onRightsChange={setHeadingRights}
            />
            <FontSelector
              label="Body font"
              fontRole="body"
              options={fontOptions}
              choice={bodyFont}
              onSelectCurated={(key) => setBodyFont({ kind: 'curated', key })}
              file={bodyFile}
              onPickFile={(f) => pickFont('body', f)}
              rights={bodyRights}
              onRightsChange={setBodyRights}
            />

            <div>
              <label className="block text-[13px] font-medium text-zinc-800" htmlFor="brand-logo">
                Logo (PNG, up to 2 MB)
              </label>
              <input
                id="brand-logo"
                type="file"
                accept="image/png"
                onChange={(e) => {
                  pickLogo(e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="mt-1.5 block w-full text-[12px] text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:font-medium hover:file:bg-zinc-50"
              />
            </div>

            <div>
              <span className="block text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Preview
              </span>
              <div className="mt-2">
                <LiveBrandPreview
                  previewKey="editor"
                  brandColour={isValidHexColour(brandColour) ? brandColour : DEFAULT_BRAND}
                  accentColour={isValidHexColour(accentColour) ? accentColour : DEFAULT_ACCENT}
                  displayName={displayName}
                  logoUrl={logoPreview}
                  headingChoice={headingFont}
                  bodyChoice={bodyFont}
                  headingFile={headingFile}
                  bodyFile={bodyFile}
                  headingFontUrl={existing?.headingFontUrl ?? null}
                  bodyFontUrl={existing?.bodyFontUrl ?? null}
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-zinc-900/10 bg-[#FBF7F1] px-3 py-2 text-[13px] text-zinc-800"
            data-testid="brand-editor-error"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#a44f30] disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {pending ? 'Saving…' : existing ? 'Save changes' : 'Create preset'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-zinc-800">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function FontSelector({
  label,
  fontRole,
  options,
  choice,
  onSelectCurated,
  file,
  onPickFile,
  rights,
  onRightsChange,
}: {
  label: string;
  fontRole: 'heading' | 'body';
  options: FontOption[];
  choice: FontChoice;
  onSelectCurated: (key: string) => void;
  file: File | null;
  onPickFile: (file: File | undefined) => void;
  rights: boolean;
  onRightsChange: (next: boolean) => void;
}) {
  const selectId = `font-${fontRole}`;
  const isCustom = choice.kind === 'custom';
  // When a custom font is active, surface a sentinel option so the dropdown
  // doesn't misleadingly display a curated family. Picking a real option below
  // switches the role to curated (the user actively replacing the custom font).
  const selectValue = isCustom ? CUSTOM_FONT_VALUE : choice.key;
  return (
    <div>
      <label htmlFor={selectId} className="block text-[13px] font-medium text-zinc-800">
        {label}
      </label>
      <select
        id={selectId}
        value={selectValue}
        onChange={(e) => onSelectCurated(e.target.value)}
        className="mt-1.5 h-9 w-full rounded-lg border border-zinc-300 bg-white px-2 text-[13px] text-zinc-900 focus:border-[#a8482a] focus:outline-none"
      >
        {isCustom ? (
          <option value={CUSTOM_FONT_VALUE} disabled>
            Custom (uploaded)
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>

      {isCustom && !file ? (
        <p className="mt-1.5 text-[12px] text-zinc-500">
          Custom font uploaded. Pick a new file below to replace it, or choose a curated font above.
        </p>
      ) : null}

      <label className="mt-2 block text-[12px] text-zinc-600">
        Upload custom font (.ttf)
        <input
          type="file"
          accept=".ttf"
          onChange={(e) => {
            onPickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
          className="mt-1 block w-full text-[12px] text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:font-medium hover:file:bg-zinc-50"
        />
      </label>

      {file ? (
        <div className="mt-2">
          <p className="text-[12px] text-zinc-700">Selected: {file.name}</p>
          <label className="mt-1.5 flex items-start gap-2 text-[12px] text-zinc-700">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => onRightsChange(e.target.checked)}
              className="mt-0.5 accent-[#a8482a]"
            />
            <span>I have the right to embed this font.</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
