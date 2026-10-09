PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, mobile_e164 TEXT NOT NULL UNIQUE,
 mobile_display TEXT NOT NULL, follow_up_status TEXT NOT NULL DEFAULT 'new'
 CHECK (follow_up_status IN ('new','contacted','viewing_planned','follow_up','qualified','closed_won','closed_lost','do_not_contact')),
 notes TEXT NOT NULL DEFAULT '', first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL,
 visit_count INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consent_events (
 id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), consented INTEGER NOT NULL CHECK (consented IN (0,1)),
 consent_text_version TEXT NOT NULL, consent_text TEXT NOT NULL, source_path TEXT NOT NULL,
 privacy_version TEXT, request_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visits (
 id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), session_id TEXT NOT NULL,
 path TEXT NOT NULL, referrer TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
 user_agent_family TEXT, country_code TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS owner_login_codes (
 id TEXT PRIMARY KEY, email_hash TEXT NOT NULL, code_hash TEXT NOT NULL,
 attempt_count INTEGER NOT NULL DEFAULT 0, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lead_status_events (
 id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id), previous_status TEXT,
 new_status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile_e164);
CREATE INDEX IF NOT EXISTS idx_leads_last_seen ON leads(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(follow_up_status);
CREATE INDEX IF NOT EXISTS idx_consent_lead_created ON consent_events(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visits_lead_created ON visits(lead_id, created_at);
CREATE INDEX IF NOT EXISTS idx_login_email_created ON owner_login_codes(email_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_status_lead_created ON lead_status_events(lead_id, created_at);
