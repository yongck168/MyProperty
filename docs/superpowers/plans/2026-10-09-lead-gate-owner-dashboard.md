# Lead Gate and Owner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-enforced Malaysian mobile lead gate, durable consent and visit storage, returning-device access, and an email-code-protected owner lead dashboard while preserving the current landing page.

**Architecture:** Migrate the static page to a TypeScript Cloudflare Worker deployed through Sites. Route public and owner requests server-side, persist data in D1, issue separate signed visitor and owner cookies, and send owner one-time codes through a small email-provider adapter.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, OpenAI Sites hosting, Vitest, Resend HTTP API, HTML/CSS/vanilla JavaScript.

**Spec:** `docs/superpowers/specs/2026-10-09-lead-gate-owner-dashboard-design.md`

## Global Constraints

- Preserve the existing Calvin Yong branding, listings, links, responsive layout, analytics intent, and WhatsApp routing.
- An unauthorized response must contain no listing cards, listing details, or protected PropertyGuru links.
- Server-side validation is authoritative; accepted mobile values normalize to E.164 and match `^\\+601[0-9]{8,9}$`.
- Consent must be explicit, unchecked by default, versioned, and stored as an append-only event.
- D1 binding is `DB`; secrets and the exact owner email must never be committed.
- Visitor and owner cookies must be separate, signed, HTTP-only, Secure, and SameSite=Lax.
- Owner one-time codes expire in ten minutes, are single-use, hashed at rest, and rate-limited.
- Raw IP addresses are not stored.
- State-changing routes require same-origin checks and CSRF protection.
- Follow-up statuses are `new`, `contacted`, `viewing_planned`, `follow_up`, `qualified`, `closed_won`, `closed_lost`, and `do_not_contact`.
- Production errors expose only a request identifier.
- Implement every production behavior through a witnessed failing test before its implementation.

## Review Focus

- A formatted Malaysian number such as `018-313 8136` must normalize correctly, while landlines, short values, and foreign numbers must be rejected.
- A duplicate mobile submission must not create a duplicate lead; it must update activity and append new consent and visit records.
- Database failure during registration must neither unlock the visitor nor partially persist consent.
- Direct requests for protected routes and assets must not reveal listing content without a valid visitor session.
- Spreadsheet-formula prefixes in names, mobile display values, or notes must be neutralized in CSV output.

---

### Task 1: Worker project foundation and database schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `wrangler.toml`
- Create: `.openai/hosting.json`
- Create: `.dev.vars.example`
- Create: `migrations/0001_initial.sql`
- Create: `app/types.ts`
- Create: `app/worker.ts`
- Create: `tests/schema.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the approved design specification and Sites Worker/D1 bindings.
- Produces: `Env` with `DB`, service variables, and secret variables; a Worker default export with `fetch(request, env, ctx): Promise<Response>`; the complete D1 schema.

- [ ] **Step 1: Write the failing schema and Worker smoke tests**

Add tests named `creates_required_tables_and_indexes`, `declares_all_required_environment_keys`, and `worker_returns_not_found_for_unknown_route`. Assert the exact tables and indexes from the spec and a generic 404 with a request identifier.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- tests/schema.test.ts`  
Expected: FAIL because the migration, types, and Worker entry point do not exist.

- [ ] **Step 3: Add the minimal TypeScript Worker scaffold and D1 migration**

Define `Env` in `app/types.ts`; create the schema with foreign keys, constraints, and indexes; add package scripts for test, typecheck, build, and migration validation. Configure `DB` in `wrangler.toml` and `.openai/hosting.json` without real IDs or credentials.

- [ ] **Step 4: Run focused and project checks**

Run: `npm test -- tests/schema.test.ts && npm run typecheck`  
Expected: PASS with no warnings.

- [ ] **Step 5: Commit**

`git add package.json tsconfig.json vitest.config.ts wrangler.toml .openai/hosting.json .dev.vars.example migrations app/types.ts app/worker.ts tests/schema.test.ts README.md && git commit -m "build: add worker and d1 foundation"`

### Task 2: Malaysian mobile validation and signed visitor sessions

**Files:**
- Create: `app/domain/mobile.ts`
- Create: `app/auth/cookies.ts`
- Create: `app/auth/visitor-session.ts`
- Create: `tests/mobile.test.ts`
- Create: `tests/visitor-session.test.ts`

**Interfaces:**
- Consumes: `Env.VISITOR_SESSION_SECRET_CURRENT`, optional previous secret, and `VISITOR_SESSION_DAYS`.
- Produces: `normalizeMalaysianMobile(input: string): MobileResult`; `createVisitorSession(leadId: string, env: Env, now?: Date): Promise<string>`; `verifyVisitorSession(cookieHeader: string | null, env: Env, now?: Date): Promise<VisitorClaims | null>`.

- [ ] **Step 1: Write failing mobile-format tests**

Test local, `60`, and `+60` forms with spaces/hyphens/parentheses; assert `018-313 8136` becomes `+60183138136`. Test landline, short, long, alphabetic, and foreign inputs as invalid.

- [ ] **Step 2: Run the mobile tests and verify RED**

Run: `npm test -- tests/mobile.test.ts`  
Expected: FAIL because `normalizeMalaysianMobile` does not exist.

- [ ] **Step 3: Implement the minimal normalizer**

Return a discriminated union containing either `{ok: true, e164, display}` or `{ok: false, reason}`; enforce the spec regex after normalization.

- [ ] **Step 4: Run the mobile tests and verify GREEN**

Run: `npm test -- tests/mobile.test.ts`  
Expected: PASS.

- [ ] **Step 5: Write failing visitor-session tests**

Test valid round-trip, tampering, expiry, current/previous key rotation, missing cookie, and exact cookie flags.

- [ ] **Step 6: Run visitor-session tests and verify RED**

Run: `npm test -- tests/visitor-session.test.ts`  
Expected: FAIL because visitor session functions do not exist.

- [ ] **Step 7: Implement signed visitor cookies**

Use Web Crypto HMAC-SHA-256 with versioned claims and constant-time signature comparison. Do not persist bearer tokens.

- [ ] **Step 8: Run focused tests and typecheck**

Run: `npm test -- tests/mobile.test.ts tests/visitor-session.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 9: Commit**

`git add app/domain/mobile.ts app/auth/cookies.ts app/auth/visitor-session.ts tests/mobile.test.ts tests/visitor-session.test.ts && git commit -m "feat: validate mobile numbers and visitor sessions"`

### Task 3: Lead registration, consent, visits, and protected landing page

**Files:**
- Create: `app/domain/consent.ts`
- Create: `app/domain/leads.ts`
- Create: `app/routes/public.ts`
- Create: `app/templates/access.ts`
- Create: `app/templates/landing.ts`
- Create: `public/assets/site.css`
- Create: `public/assets/site.js`
- Create: `tests/public-access.test.ts`
- Modify: `app/worker.ts`
- Modify: `index.html`

**Interfaces:**
- Consumes: `normalizeMalaysianMobile`, visitor-session functions, `Env.DB`, consent/privacy versions, and existing `index.html` content.
- Produces: `handlePublicRequest(request: Request, env: Env): Promise<Response>`; `registerLead(input: RegistrationInput, context: VisitContext, env: Env): Promise<LeadRegistration>`; protected landing template.

- [ ] **Step 1: Write failing access-boundary tests**

Assert unauthorized `/` returns the gate; its body excludes listing names, prices, PropertyGuru links, and listing image data. Assert direct protected route access also returns the gate.

- [ ] **Step 2: Run the boundary tests and verify RED**

Run: `npm test -- tests/public-access.test.ts -t "access boundary"`  
Expected: FAIL because public routing and templates do not exist.

- [ ] **Step 3: Implement server-side gate routing and minimal accessible gate template**

Render name, mobile, unchecked consent, field errors, and CSRF token. Route authorized visitors to a placeholder protected response without yet adding listing content.

- [ ] **Step 4: Run the boundary tests and verify GREEN**

Run: `npm test -- tests/public-access.test.ts -t "access boundary"`  
Expected: PASS.

- [ ] **Step 5: Write failing registration-transaction tests**

Assert invalid input creates nothing; consent is mandatory; successful registration atomically creates/updates the lead, appends consent, records visit, then sets the cookie. Assert duplicate submission behavior and that simulated D1 failure creates no cookie or partial records.

- [ ] **Step 6: Run registration tests and verify RED**

Run: `npm test -- tests/public-access.test.ts -t "registration"`  
Expected: FAIL because registration persistence is absent.

- [ ] **Step 7: Implement transactional registration and visit recording**

Use D1 batch/transaction semantics supported by the runtime. Store request ID, UTM fields, referrer, coarse user-agent family, and country code; never store raw IP.

- [ ] **Step 8: Run registration tests and verify GREEN**

Run: `npm test -- tests/public-access.test.ts -t "registration"`  
Expected: PASS.

- [ ] **Step 9: Write failing returning-device and visual-preservation tests**

Assert a valid cookie returns the existing listing names, prices, links, WhatsApp number, Calvin branding, responsive viewport, and accessibility landmarks; assert invalid/expired cookies return the gate and visits increment only for verified access.

- [ ] **Step 10: Run landing tests and verify RED**

Run: `npm test -- tests/public-access.test.ts -t "protected landing"`  
Expected: FAIL because the full protected template is absent.

- [ ] **Step 11: Extract and integrate the existing landing page**

Move current styles and scripts into assets, preserve content and behavior, remove the obsolete static submission-only access assumption, and ensure all protected listing markup is produced only in the authorized branch.

- [ ] **Step 12: Run all public-flow tests and typecheck**

Run: `npm test -- tests/public-access.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 13: Commit**

`git add app/domain app/routes/public.ts app/templates/access.ts app/templates/landing.ts public/assets tests/public-access.test.ts app/worker.ts index.html && git commit -m "feat: enforce persistent visitor lead gate"`

### Task 4: Owner email-code authentication

**Files:**
- Create: `app/email/provider.ts`
- Create: `app/auth/owner-session.ts`
- Create: `app/routes/owner-auth.ts`
- Create: `app/templates/owner-login.ts`
- Create: `tests/owner-auth.test.ts`
- Modify: `app/worker.ts`

**Interfaces:**
- Consumes: owner/email environment values and D1 `owner_login_codes`.
- Produces: `requestOwnerCode(email: string, context: LoginContext, env: Env): Promise<void>`; `verifyOwnerCode(email: string, code: string, env: Env): Promise<OwnerVerification>`; `verifyOwnerSession(cookieHeader: string | null, env: Env): Promise<OwnerClaims | null>`; owner auth routes.

- [ ] **Step 1: Write failing owner authentication tests**

Test allowed and unapproved emails with indistinguishable responses; email-send failure; hashed code storage; ten-minute expiry; single use; attempt limit; request/verification rate limits; cookie flags; logout; and current/previous key rotation.

- [ ] **Step 2: Run owner-auth tests and verify RED**

Run: `npm test -- tests/owner-auth.test.ts`  
Expected: FAIL because owner authentication does not exist.

- [ ] **Step 3: Implement the email adapter and owner authentication**

Use Web Crypto for code generation/hashing and Resend only inside the adapter. Never log plaintext codes. Keep the login response generic and remove expired rows opportunistically.

- [ ] **Step 4: Run owner-auth tests and typecheck**

Run: `npm test -- tests/owner-auth.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git add app/email/provider.ts app/auth/owner-session.ts app/routes/owner-auth.ts app/templates/owner-login.ts tests/owner-auth.test.ts app/worker.ts && git commit -m "feat: add owner email code authentication"`

### Task 5: Private owner lead dashboard

**Files:**
- Create: `app/routes/owner.ts`
- Create: `app/templates/owner-dashboard.ts`
- Create: `public/assets/owner.css`
- Create: `public/assets/owner.js`
- Create: `tests/owner-leads.test.ts`
- Modify: `app/domain/leads.ts`
- Modify: `app/worker.ts`

**Interfaces:**
- Consumes: verified owner claims, D1 lead services, status enum, and CSRF validation.
- Produces: `searchLeads(query: string, status: FollowUpStatus | null, env: Env): Promise<LeadSummary[]>`; `updateLeadNotes(leadId: string, notes: string, env: Env): Promise<void>`; `updateLeadStatus(leadId: string, status: FollowUpStatus, env: Env): Promise<void>`; `exportLeadsCsv(env: Env): Promise<string>`; owner dashboard routes.

- [ ] **Step 1: Write failing authorization and query tests**

Assert unauthenticated dashboard/API requests return no lead data. Test newest-first listing, name/mobile search with formatted mobile input, status filtering, consent visibility, and visit summary.

- [ ] **Step 2: Run dashboard query tests and verify RED**

Run: `npm test -- tests/owner-leads.test.ts -t "query"`  
Expected: FAIL because dashboard services and routes do not exist.

- [ ] **Step 3: Implement dashboard reads and accessible templates**

Render private pages with `Cache-Control: no-store`; keep responsive table/card behavior and text-only rendering for user content.

- [ ] **Step 4: Run dashboard query tests and verify GREEN**

Run: `npm test -- tests/owner-leads.test.ts -t "query"`  
Expected: PASS.

- [ ] **Step 5: Write failing mutation and CSV tests**

Test same-origin and CSRF rejection, valid notes, invalid/valid statuses, status-event history, persistence, and CSV neutralization for values beginning with `=`, `+`, `-`, or `@`.

- [ ] **Step 6: Run mutation tests and verify RED**

Run: `npm test -- tests/owner-leads.test.ts -t "mutation|CSV"`  
Expected: FAIL because mutations/export are absent.

- [ ] **Step 7: Implement notes, status history, and safe CSV export**

Use parameterized D1 statements and exact allowed statuses. Prefix spreadsheet-dangerous CSV cells with a single quote before RFC 4180 quoting.

- [ ] **Step 8: Run dashboard tests and typecheck**

Run: `npm test -- tests/owner-leads.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 9: Commit**

`git add app/routes/owner.ts app/templates/owner-dashboard.ts public/assets/owner.css public/assets/owner.js tests/owner-leads.test.ts app/domain/leads.ts app/worker.ts && git commit -m "feat: add private lead dashboard"`

### Task 6: Security hardening and complete repository verification

**Files:**
- Create: `app/security.ts`
- Create: `tests/security.test.ts`
- Modify: `app/worker.ts`
- Modify: `README.md`
- Modify: `.openai/hosting.json`
- Modify: `wrangler.toml`

**Interfaces:**
- Consumes: all route handlers and environment configuration.
- Produces: `withSecurityHeaders(response: Response, requestId: string): Response`; final documented deployment contract and verified build artifact.

- [ ] **Step 1: Write failing security tests**

Assert CSP, frame denial, nosniff, referrer policy, permissions policy, request IDs, generic 500 output, no-store owner responses, same-origin enforcement, and non-disclosure of secrets/stack traces.

- [ ] **Step 2: Run security tests and verify RED**

Run: `npm test -- tests/security.test.ts`  
Expected: FAIL because centralized hardening is absent.

- [ ] **Step 3: Implement security headers and production error boundary**

Generate a per-request identifier, wrap all routes, and apply route-appropriate caching.

- [ ] **Step 4: Run security tests and verify GREEN**

Run: `npm test -- tests/security.test.ts`  
Expected: PASS.

- [ ] **Step 5: Complete deployment and rollback documentation**

Document exact D1 creation/migration commands, Sites binding fields, every variable/secret, Resend sender verification, private-preview deployment, production promotion, smoke checks, and rollback to the previous Sites version. Do not put real credentials in examples.

- [ ] **Step 6: Run the full local verification suite**

Run: `npm test && npm run typecheck && npm run build`  
Expected: all tests PASS, typecheck exits 0, and the Worker build succeeds without warnings.

- [ ] **Step 7: Validate the migration against a fresh local D1 database**

Run the repository's documented local migration-validation command.  
Expected: all tables/indexes exist and a second migration invocation is safe.

- [ ] **Step 8: Commit**

`git add app/security.ts tests/security.test.ts app/worker.ts README.md .openai/hosting.json wrangler.toml && git commit -m "chore: harden and document deployment"`

### Task 7: Private preview deployment and end-to-end verification

**Files:**
- Modify only if verification finds a tested defect; every defect requires a failing regression test first.

**Interfaces:**
- Consumes: completed Worker source, Sites project, preview D1 database, configured variables/secrets, and verified Resend sender.
- Produces: a private preview deployment with recorded version, migration state, and evidence for every acceptance criterion.

- [ ] **Step 1: Create or connect the Sites project and preview D1 database**

Persist the returned Sites project ID in `.openai/hosting.json`, bind the preview database as `DB`, and configure all required variables/secrets through the hosting environment.

- [ ] **Step 2: Apply the migration to preview**

Run the documented remote preview migration command.  
Expected: migration succeeds once and schema inspection shows all required tables/indexes.

- [ ] **Step 3: Package and deploy a private preview**

Use the Sites source workflow, save a version, deploy privately, and retain the returned version ID and URL.

- [ ] **Step 4: Verify public access end to end**

Confirm unauthenticated source contains no protected listing data; invalid numbers and missing consent are rejected; a valid submission persists lead/consent/visit; the same browser returns unlocked; another clean browser remains gated.

- [ ] **Step 5: Verify owner authentication and dashboard end to end**

Request the email code through the configured owner address, sign in, search the test lead, inspect consent, update notes/status, export CSV, sign out, and confirm unauthorized access is restored.

- [ ] **Step 6: Verify responsive behavior and preserved content**

Check representative mobile and desktop widths, navigation, listing content, PropertyGuru links, WhatsApp routing, keyboard focus, and no horizontal overflow.

- [ ] **Step 7: Re-run automated checks against unchanged source**

Run: `npm test && npm run typecheck && npm run build`  
Expected: all checks pass.

- [ ] **Step 8: Commit any deployment-manifest identity update**

`git add .openai/hosting.json && git commit -m "chore: connect private preview deployment"`

### Task 8: Pull request, review, and controlled production release

**Files:**
- Modify only for reviewed, tested corrections.

**Interfaces:**
- Consumes: verified feature branch and private preview evidence.
- Produces: reviewable pull request and, only after approval, a production deployment with rollback version retained.

- [ ] **Step 1: Push the completed feature branch and open a pull request**

Describe the architecture, schema, environment requirements, verification commands, private-preview result, known limitations, and rollback procedure.

- [ ] **Step 2: Review the complete diff against the approved specification**

Check every acceptance criterion, protected-content boundary, migration, secret reference, and preservation requirement. Record any limitation without overstating completion.

- [ ] **Step 3: Resolve findings through TDD**

For every code defect, write and witness a failing regression test, implement the minimal correction, and rerun the full suite.

- [ ] **Step 4: Obtain explicit production-release approval**

Do not merge or deploy publicly before approval because the release begins collecting personal contact and consent data.

- [ ] **Step 5: Configure production D1, variables, secrets, and migration**

Confirm the exact production `OWNER_EMAIL`, verified `EMAIL_FROM`, canonical `SITE_ORIGIN`, unique production secrets, and successful schema migration.

- [ ] **Step 6: Merge and deploy the reviewed version**

Preserve the previous production version ID, deploy the approved version, and retain the new deployment identifiers.

- [ ] **Step 7: Run production smoke checks**

Test the gate, persistence, same-device unlock, owner code, dashboard changes, CSV export, WhatsApp links, and direct-route protection using designated test records.

- [ ] **Step 8: Record the verified outcome**

Report the deployed URL, commit SHA, Sites version/deployment IDs, database migration version, checks passed, and any remaining limitation. Only now claim persistent storage and owner access are implemented.
