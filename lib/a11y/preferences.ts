/**
 * Shape of the `profiles.a11y_preferences` jsonb column.
 * Optional fields are absent by default; consumers must apply
 * their own defaults.
 */
export interface A11yPreferences {
  colourblindMode?: boolean;
}

export const A11Y_PREFERENCES_DEFAULTS = {
  colourblindMode: false,
} as const satisfies Required<A11yPreferences>;

/**
 * Normalises a raw `a11y_preferences` JSON value (which Supabase
 * types as `Json | null` and may be `{}`) into a fully-populated
 * A11yPreferences object backed by A11Y_PREFERENCES_DEFAULTS.
 */
export function normaliseA11yPreferences(
  raw: unknown,
): Required<A11yPreferences> {
  if (raw === null || typeof raw !== 'object') return { ...A11Y_PREFERENCES_DEFAULTS };
  const obj = raw as Record<string, unknown>;
  return {
    colourblindMode:
      typeof obj.colourblindMode === 'boolean'
        ? obj.colourblindMode
        : A11Y_PREFERENCES_DEFAULTS.colourblindMode,
  };
}
