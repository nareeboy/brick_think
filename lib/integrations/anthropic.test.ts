import { afterEach, describe, expect, it } from 'vitest';
import { getServerAnthropicClient } from './anthropic';

const ORIG = process.env.ANTHROPIC_API_KEY;
afterEach(() => {
  if (ORIG === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = ORIG;
});

describe('getServerAnthropicClient', () => {
  it('returns no_claude_key when ANTHROPIC_API_KEY is unset', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = getServerAnthropicClient();
    expect(res).toEqual({ ok: false, code: 'no_claude_key' });
  });

  it('returns no_claude_key when ANTHROPIC_API_KEY is empty', () => {
    process.env.ANTHROPIC_API_KEY = '';
    expect(getServerAnthropicClient().ok).toBe(false);
  });

  it('returns ok with a client when the key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-xxx';
    const res = getServerAnthropicClient();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.client).toBeTruthy();
  });
});
