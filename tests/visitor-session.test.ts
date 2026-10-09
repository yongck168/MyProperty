import { describe, expect, it } from 'vitest';
import { createVisitorSession, verifyVisitorSession } from '../app/auth/visitor-session';
import type { Env } from '../app/types';
const env={VISITOR_SESSION_SECRET_CURRENT:'a'.repeat(32),VISITOR_SESSION_SECRET_PREVIOUS:'b'.repeat(32),VISITOR_SESSION_DAYS:'180'} as Env;
describe('visitor sessions', () => {
  it('round trips and applies secure flags', async () => {
    const cookie=await createVisitorSession('lead-1',env,new Date('2026-01-01T00:00:00Z'));
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('Secure'); expect(cookie).toContain('SameSite=Lax');
    expect((await verifyVisitorSession(cookie,env,new Date('2026-01-02T00:00:00Z')))?.leadId).toBe('lead-1');
  });
  it('rejects tampering and expiry', async () => {
    const cookie=await createVisitorSession('lead-1',env,new Date('2026-01-01T00:00:00Z'));
    const raw=cookie.match(/visitor_access=([^;]+)/)![1];
    const tampered=`visitor_access=${raw.slice(0,-1)}${raw.endsWith('A')?'B':'A'}`;
    expect(await verifyVisitorSession(tampered,env,new Date('2026-01-02T00:00:00Z'))).toBeNull();
    expect(await verifyVisitorSession(cookie,env,new Date('2027-01-02T00:00:00Z'))).toBeNull();
  });
  it('accepts a cookie signed by the previous rotation key', async () => {
    const old={...env,VISITOR_SESSION_SECRET_CURRENT:'b'.repeat(32),VISITOR_SESSION_SECRET_PREVIOUS:undefined} as never;
    const cookie=await createVisitorSession('lead-1',old,new Date('2026-01-01T00:00:00Z'));
    expect((await verifyVisitorSession(cookie,env,new Date('2026-01-02T00:00:00Z')))?.leadId).toBe('lead-1');
  });
});
