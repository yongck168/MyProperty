import { readFileSync } from 'node:fs';
const sql = readFileSync('migrations/0001_initial.sql', 'utf8');
for (const table of ['leads','consent_events','visits','owner_login_codes','lead_status_events']) {
  if (!sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) throw new Error(`Missing table: ${table}`);
}
console.log('Migration structure valid');
