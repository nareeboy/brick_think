// components/careers/PhoneInput.tsx
'use client';

import { useId, useState } from 'react';

import { COUNTRY_CODES, DEFAULT_COUNTRY_ISO } from '@/lib/careers/countryCodes';

// Emits a hidden `phone` input as the composed +<dial><number> E.164-ish
// string. The visible inputs are not submitted directly.
export function PhoneInput({ label = 'Contact number' }: { label?: string }) {
  const [iso, setIso] = useState(DEFAULT_COUNTRY_ISO);
  const [number, setNumber] = useState('');
  const selectId = useId();
  const numberId = useId();

  const dial = COUNTRY_CODES.find((c) => c.iso === iso)?.dial ?? '+44';
  const composed = `${dial}${number.replace(/[^0-9\s]/g, '')}`;

  return (
    <div>
      <label htmlFor={numberId} className="block text-sm font-medium text-zinc-800">
        {label}
      </label>
      <div className="mt-1.5 flex gap-2">
        <label htmlFor={selectId} className="sr-only">
          Country dialling code
        </label>
        <select
          id={selectId}
          value={iso}
          onChange={(e) => setIso(e.target.value)}
          className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 focus:border-[#a8482a] focus:outline-none focus:ring-1 focus:ring-[#a8482a]"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          id={numberId}
          type="tel"
          inputMode="tel"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="7700 900123"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#a8482a] focus:outline-none focus:ring-1 focus:ring-[#a8482a]"
        />
      </div>
      <input type="hidden" name="phone" value={composed} />
    </div>
  );
}
