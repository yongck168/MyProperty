import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import worker from '../app/worker';

describe('foundation', () => {
  it('creates required tables and indexes', () => {
    const sql = readFileSync('migrations/0001_initial.sql', 'utf8');
    for (const table of ['leads', 'consent_events', 'visits', 'owner_login_codes', 'lead_status_events']) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    }
    expect((sql.match(/CREATE (?:UNIQUE )?INDEX IF NOT EXISTS/g) || [])).toHaveLength(7);
  });

  it('declares all required environment keys', () => {
    const source = readFileSync('app/types.ts', 'utf8');
    for (const key of ['DB', 'OWNER_EMAIL', 'EMAIL_FROM', 'SITE_ORIGIN', 'VISITOR_SESSION_SECRET_CURRENT', 'OWNER_SESSION_SECRET_CURRENT', 'OTP_PEPPER', 'RESEND_API_KEY']) {
      expect(source).toContain(`${key}:`);
    }
  });

  it('worker returns not found for unknown route', async () => {
    const response = await worker.fetch(new Request('https://example.com/unknown'), {} as never, {} as never);
    expect(response.status).toBe(404);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(await response.text()).toBe('Not found');
  });
});
