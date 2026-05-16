import { jwtVerify, SignJWT } from 'jose';

export interface YjsTokenClaims {
  profileId: string;
  modelId: string;
}

export interface MintOptions extends YjsTokenClaims {
  secret: string;
  ttlSeconds: number;
}

export interface VerifyOptions {
  token: string;
  secret: string;
}

export interface MintResult {
  token: string;
  expiresAt: number;
}

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function mintYjsToken(opts: MintOptions): Promise<MintResult> {
  const expiresAt = Math.floor(Date.now() / 1000) + opts.ttlSeconds;
  const token = await new SignJWT({ modelId: opts.modelId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(opts.profileId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey(opts.secret));
  return { token, expiresAt };
}

export async function verifyYjsToken(opts: VerifyOptions): Promise<YjsTokenClaims> {
  const { payload } = await jwtVerify(opts.token, secretKey(opts.secret), {
    algorithms: ['HS256'],
  });
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('jwt missing sub');
  }
  if (!payload.modelId || typeof payload.modelId !== 'string') {
    throw new Error('jwt missing modelId');
  }
  return { profileId: payload.sub, modelId: payload.modelId };
}
