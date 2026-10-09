# Malaysian Mobile Lead Gate and Owner Dashboard Design

**Date:** 2026-10-09  
**Repository:** `yongck168/MyProperty`  
**Base commit:** `a4f6db80f963128957576c1827e3015625123581`  
**Target branch:** `feat/lead-gate-owner-dashboard`

## Purpose

Convert the current static property landing page into a server-backed application that requires every public visitor to provide a name, a valid Malaysian mobile number, and explicit follow-up consent before viewing any listing content. Persist leads and consent evidence, keep a successfully registered visitor unlocked on the same device, and provide Calvin Yong with a separately authenticated private dashboard for lead management.

The existing Calvin Yong branding, listings, links, responsive layout, analytics intent, and WhatsApp routing remain intact.

## Scope

### Public visitor flow

1. A visitor requests any protected landing-page or listing route.
2. The server checks a signed, HTTP-only access cookie.
3. Without a valid cookie, the server returns the access-gate page and no protected listing markup or listing data.
4. The visitor submits:
   - full name;
   - Malaysian mobile number;
   - required explicit consent checkbox.
5. The server validates and normalizes the mobile number to E.164 form.
6. The server writes or updates the lead, creates an immutable consent event, records visit metadata, and issues the access cookie.
7. The visitor is redirected to the protected landing page.
8. A returning visitor on the same device remains unlocked while the cookie is valid. Each verified return updates visit activity.
9. Clearing cookies, changing device/browser, cookie expiry, or cookie revocation requires gate submission again.
10. The existing enquiry form continues to open WhatsApp but is not a substitute for lead persistence.

### Owner flow

1. Calvin visits `/owner/login` and enters the email address configured in `OWNER_EMAIL`.
2. If the address matches, the server sends a short-lived one-time code.
3. The submitted code is hashed and compared server-side, is single-use, expires after ten minutes, and is rate-limited.
4. Successful verification creates a signed, HTTP-only owner session.
5. The dashboard supports:
   - newest-first lead listing;
   - search by normalized or displayed mobile number and name;
   - lead detail with consent evidence and visit summary;
   - notes;
   - follow-up status updates;
   - CSV export;
   - sign out.
6. Owner routes and APIs return no private data without a valid owner session.

## Malaysian mobile validation

Input may contain spaces, hyphens, parentheses, a leading `0`, `60`, or `+60`. The server removes formatting and normalizes locally formatted numbers to `+60`.

Accepted normalized values must match the application rule `^\\+601[0-9]{8,9}$`. This provides basic Malaysian mobile-format validation without claiming that the number is active or owned by the visitor. OTP verification of visitor mobile numbers is explicitly out of scope.

Client-side checks improve usability, but server-side validation is authoritative.

## Consent

The gate uses an unchecked required checkbox with plain-language consent to be contacted by Calvin Yong/The Roof Realty regarding property enquiries. Consent is never inferred from form submission alone.

Each successful submission records an append-only consent event containing:

- lead identifier;
- consent state;
- consent text version;
- exact rendered consent text;
- consent timestamp;
- source page;
- privacy-policy version, if displayed;
- request correlation identifier.

A later lead update must not overwrite historical consent evidence.

## Storage model

Cloudflare D1 is the durable site-managed database.

### `leads`

- `id` TEXT primary key
- `name` TEXT not null
- `mobile_e164` TEXT not null unique
- `mobile_display` TEXT not null
- `follow_up_status` TEXT not null default `new`
- `notes` TEXT not null default empty string
- `first_seen_at` TEXT not null
- `last_seen_at` TEXT not null
- `visit_count` INTEGER not null default 1
- `created_at` TEXT not null
- `updated_at` TEXT not null

Allowed follow-up statuses are `new`, `contacted`, `viewing_planned`, `follow_up`, `qualified`, `closed_won`, `closed_lost`, and `do_not_contact`.

### `consent_events`

- `id` TEXT primary key
- `lead_id` TEXT not null, foreign key to `leads.id`
- `consented` INTEGER not null
- `consent_text_version` TEXT not null
- `consent_text` TEXT not null
- `source_path` TEXT not null
- `privacy_version` TEXT
- `request_id` TEXT not null
- `created_at` TEXT not null

### `visits`

- `id` TEXT primary key
- `lead_id` TEXT not null, foreign key to `leads.id`
- `session_id` TEXT not null
- `path` TEXT not null
- `referrer` TEXT
- `utm_source` TEXT
- `utm_medium` TEXT
- `utm_campaign` TEXT
- `user_agent_family` TEXT
- `country_code` TEXT
- `created_at` TEXT not null

Raw IP addresses are not stored. Country code may be retained from trusted platform metadata. User-agent storage is reduced to a coarse family where practical.

### `owner_login_codes`

- `id` TEXT primary key
- `email_hash` TEXT not null
- `code_hash` TEXT not null
- `attempt_count` INTEGER not null default 0
- `expires_at` TEXT not null
- `used_at` TEXT
- `created_at` TEXT not null

Expired login-code rows are removed opportunistically. Owner session state is held in signed cookies rather than persisted bearer tokens.

### `lead_status_events`

- `id` TEXT primary key
- `lead_id` TEXT not null, foreign key to `leads.id`
- `previous_status` TEXT
- `new_status` TEXT not null
- `created_at` TEXT not null

This preserves a minimal follow-up audit history.

## Security boundaries

- Protected listing HTML and listing JSON are generated only after server cookie verification.
- Visitor cookies use `HttpOnly`, `Secure`, `SameSite=Lax`, a root path, an explicit expiry, key rotation support, and authenticated signing.
- Owner cookies use a distinct signing purpose and a shorter expiry.
- All state-changing requests require same-origin validation and a CSRF token.
- Login-code requests and verification are rate-limited by privacy-preserving request key and account.
- Responses do not disclose whether an unapproved owner email exists.
- One-time codes are never logged or stored in plaintext.
- Database access is server-only.
- Dashboard pages use `Cache-Control: no-store`.
- CSV export escapes spreadsheet-formula prefixes.
- Notes are rendered as text, never untrusted HTML.
- Security headers include CSP, frame denial, nosniff, strict referrer policy, and a permissions policy.
- Production errors use request identifiers and do not expose secrets or stack traces.

## Application and repository structure

The single static file is retained as the visual/content source but split into focused server application files:

- `package.json` — scripts and pinned runtime/test dependencies.
- `app/worker.ts` — request router and security-header composition.
- `app/routes/public.ts` — gate, registration, unlock, and protected landing routes.
- `app/routes/owner.ts` — owner login, code verification, dashboard, lead updates, export, and logout.
- `app/auth/visitor-session.ts` — visitor cookie signing and verification.
- `app/auth/owner-session.ts` — owner session and one-time-code policy.
- `app/domain/mobile.ts` — Malaysian number parsing and normalization.
- `app/domain/consent.ts` — consent version and immutable record creation.
- `app/domain/leads.ts` — lead persistence, search, notes, statuses, and visit recording.
- `app/email/provider.ts` — transactional-email adapter.
- `app/templates/access.ts` — public access-gate markup.
- `app/templates/landing.ts` — preserved landing-page structure and listing content.
- `app/templates/owner-login.ts` — owner sign-in pages.
- `app/templates/owner-dashboard.ts` — dashboard markup.
- `public/assets/` — extracted static CSS, JavaScript, and retained images where applicable.
- `migrations/0001_initial.sql` — D1 schema and indexes.
- `tests/mobile.test.ts` — mobile validation behavior.
- `tests/public-access.test.ts` — gate, consent, persistence, and returning-device behavior.
- `tests/owner-auth.test.ts` — owner allow-list, code expiry, single use, rate limits, and sessions.
- `tests/owner-leads.test.ts` — authorization, search, notes, status updates, consent visibility, and CSV safety.
- `tests/security.test.ts` — protected-content leakage, CSRF, cookie flags, and security headers.
- `wrangler.toml` — Worker compatibility and local bindings.
- `.openai/hosting.json` — Sites project identity and D1 binding declaration.
- `.dev.vars.example` — variable names only, with no credentials.
- `README.md` — local setup, migration, deployment, rollback, and verification instructions.

Large embedded images may remain temporarily during the first migration if extracting them risks visual regression; the final implementation must still keep listing markup out of unauthorized responses.

## Backend services

- **Runtime and hosting:** OpenAI Sites backed by Cloudflare Workers.
- **Persistent database:** Cloudflare D1, binding name `DB`.
- **Transactional email:** Resend HTTP API by default, isolated behind the email adapter so another provider can replace it.
- **Source control:** GitHub repository `yongck168/MyProperty`.
- **Deployment:** private preview first; production deployment only after all required verification passes.

## Environment variables and secrets

### Secrets

- `VISITOR_SESSION_SECRET_CURRENT` — at least 32 random bytes.
- `VISITOR_SESSION_SECRET_PREVIOUS` — optional rotation key.
- `OWNER_SESSION_SECRET_CURRENT` — distinct key of at least 32 random bytes.
- `OWNER_SESSION_SECRET_PREVIOUS` — optional rotation key.
- `OTP_PEPPER` — secret used when hashing one-time codes and email identifiers.
- `RESEND_API_KEY` — transactional-email credential.

### Non-secret deployment variables

- `OWNER_EMAIL` — Calvin's exact approved owner email.
- `EMAIL_FROM` — verified sender identity.
- `SITE_ORIGIN` — canonical HTTPS production origin.
- `CONSENT_TEXT_VERSION` — initial value `2026-10-09-v1`.
- `PRIVACY_POLICY_VERSION` — initial value `2026-10-09-v1`.
- `VISITOR_SESSION_DAYS` — default `180`.
- `OWNER_SESSION_HOURS` — default `12`.
- `OTP_TTL_MINUTES` — fixed default `10`.

No real secret or owner email is committed to Git.

## D1 indexes

The initial migration creates indexes for:

- unique `leads.mobile_e164`;
- `leads.last_seen_at`;
- `leads.follow_up_status`;
- `consent_events.lead_id, created_at`;
- `visits.lead_id, created_at`;
- `owner_login_codes.email_hash, created_at`;
- `lead_status_events.lead_id, created_at`.

## Error handling

- Invalid gate input returns field-level errors without creating a lead or cookie.
- Database failure returns a retryable error and does not unlock the visitor.
- Duplicate mobile submissions update the lead's name and activity safely, append a new consent event, and create a visit.
- Email-provider failure returns a generic owner-login message and does not create a usable code.
- Invalid, expired, reused, or over-attempted codes fail uniformly.
- Unauthorized owner API requests return `401`; authenticated requests lacking CSRF validation return `403`.
- Invalid follow-up states return `400`.
- Unexpected failures return a generic `500` with a request identifier.

## Deployment settings

The Sites hosting manifest declares the project identifier and D1 binding. The Worker uses a current compatibility date and no Node.js compatibility unless a selected dependency requires it.

Deployment sequence:

1. Create or connect the Sites project.
2. Create separate preview and production D1 databases.
3. Apply the initial migration to preview.
4. Configure preview secrets and variables.
5. Deploy a private preview.
6. Run automated and browser verification.
7. Confirm email delivery and owner sign-in.
8. Confirm gate storage and same-device return access.
9. Confirm direct URLs do not leak listing content.
10. Apply the migration and configuration to production.
11. Deploy production and run smoke checks.
12. Preserve the previous version for immediate rollback.

## Test-first implementation requirements

Each behavior is introduced through a failing automated test before production code:

- Malaysian mobile normalization and rejection cases.
- Consent required server-side.
- No lead/cookie on failed persistence.
- Successful lead, consent, and visit transaction.
- Same-device cookie unlock.
- Protected-content non-disclosure.
- Owner email allow-list.
- One-time-code expiry, single use, attempt limits, and rate limits.
- Dashboard authentication.
- Search normalization.
- Notes and valid status transitions.
- Consent visibility.
- Safe CSV generation.
- CSRF and security headers.

The full suite, build, migration validation, and deployment smoke checks must pass before completion is claimed.

## Acceptance criteria

- An unauthenticated response contains no listing cards, listing details, or protected property links.
- Every public viewer must pass server-side Malaysian-mobile validation and explicit consent before access.
- Successful submission persists the lead, consent event, and visit before issuing access.
- Returning access works on the same device through a valid signed cookie.
- Calvin can obtain a one-time code only through the configured owner email and manage leads after authentication.
- Lead search, notes, statuses, consent records, and CSV export work and persist.
- Existing branding, listings, links, responsive design, and WhatsApp routing remain functionally equivalent after unlock.
- Required files, service bindings, variables, secrets, migrations, and deployment steps are documented.
- No claim of persistence, owner access, or production readiness is made until preview verification proves it.
