// Placeholder for the type definitions emitted by Supabase.
// Regenerate via `pnpm db:types` whenever the schema changes; that command
// runs `supabase gen types typescript --local` and overwrites this file.
//
// Until then, the Database type below is intentionally permissive so the
// SDK clients compile without strict row typing. Phase 4 adds real types.

export interface Database {
  public: {
    Tables: Record<string, { Row: unknown; Insert: unknown; Update: unknown }>;
    Views: Record<string, { Row: unknown }>;
    Functions: Record<string, { Args: unknown; Returns: unknown }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, unknown>;
  };
}
