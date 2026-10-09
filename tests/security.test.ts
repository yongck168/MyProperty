import {describe,expect,it} from 'vitest';
import worker from '../app/worker';
import type {Env} from '../app/types';
const env={VISITOR_SESSION_SECRET_CURRENT:'a'.repeat(32),VISITOR_SESSION_DAYS:'180',SITE_ORIGIN:'https://example.com'} as Env;
describe('security',()=>{
 it('adds browser security headers and request id',async()=>{
  const r=await worker.fetch(new Request('https://example.com/'),env,{} as ExecutionContext);
  expect(r.headers.get('content-security-policy')).toContain("default-src 'self'");
  expect(r.headers.get('x-frame-options')).toBe('DENY');
  expect(r.headers.get('x-content-type-options')).toBe('nosniff');
  expect(r.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  expect(r.headers.get('x-request-id')).toBeTruthy();
 });
 it('rejects cross-origin state changes',async()=>{
  const r=await worker.fetch(new Request('https://example.com/owner/logout',{method:'POST',headers:{origin:'https://evil.example'}}),env,{} as ExecutionContext);
  expect(r.status).toBe(403);
 });
});
