-- 20260520170000_user_integrations_text_columns.sql
-- Switch the AES ciphertext + nonce columns from bytea to text storing
-- base64. The bytea path was unreliable through supabase-js (Buffer values
-- were serialised as JSON ({"type":"Buffer","data":[...]}) and stored as
-- raw ASCII), so decrypt failed on read. Storing base64 in text is opaque,
-- safe to round-trip through PostgREST, and we only equality-match on
-- profile_id — never inspect or query the encrypted content directly.

-- Any pre-existing rows from the broken-bytea era contain unrecoverable
-- ciphertext; drop them. Users will paste their key again.
delete from public.user_integrations;

alter table public.user_integrations
  alter column anthropic_api_key_ciphertext type text using null,
  alter column anthropic_api_key_nonce type text using null;
