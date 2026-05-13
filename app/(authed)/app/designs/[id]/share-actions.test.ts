import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createServerSupabaseClient } from '@/lib/db/server';
import { createShareLink } from './share-actions';

function mockUser(userId: string | null) {
  const inserted: unknown[] = [];
  const updated: { revoked_at?: string }[] = [];
  (createServerSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: (_table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'm1', owner_profile_id: userId }, error: null }) }) }),
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            inserted.push(row);
            return { data: { id: 'l1', token: row.token, expires_at: row.expires_at }, error: null };
          },
        }),
      }),
      update: (patch: { revoked_at: string }) => {
        updated.push(patch);
        return { eq: () => ({ select: async () => ({ data: [{ id: 'l1' }], error: null }) }) };
      },
    }),
  });
  return { inserted, updated };
}

describe('createShareLink', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates a 43-char base64url token and sets expires_at 7 days out for "7d"', async () => {
    const { inserted } = mockUser('u1');
    const result = await createShareLink('m1', '7d');
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = inserted[0] as { token: string; expires_at: string | null; created_by: string };
    expect(row.created_by).toBe('u1');
    expect(row.expires_at).not.toBeNull();
    const diffMs = new Date(row.expires_at!).getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
    expect(diffMs).toBeLessThan(7.1 * 24 * 3600 * 1000);
  });

  it('writes expires_at = null for "never"', async () => {
    const { inserted } = mockUser('u1');
    await createShareLink('m1', 'never');
    const row = inserted[0] as { expires_at: string | null };
    expect(row.expires_at).toBeNull();
  });

  it('rejects invalid ttl strings', async () => {
    mockUser('u1');
    await expect(createShareLink('m1', 'forever' as unknown as '1d')).rejects.toThrow();
  });

  it('throws when the model is not visible to the user (RLS-filtered or non-existent)', async () => {
    (createServerSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      }),
    });
    await expect(createShareLink('m1', '7d')).rejects.toThrow(/Model not found/);
  });
});
