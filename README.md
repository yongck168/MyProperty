# MyProperty

Calvin Yong's property landing page. The `feat/lead-gate-owner-dashboard`
branch migrates the static site to a Cloudflare Worker with D1-backed lead
and consent storage. See the design and implementation plan under
`docs/superpowers/`.

## Architecture

- Cloudflare Worker entry point: `app/worker.ts`
- Protected original landing page: `static/index.html`
- Durable storage: Cloudflare D1 through binding `DB`
- Owner login email: Resend HTTP API
- Owner dashboard: `/owner` (email one-time code)

The Worker runs before static assets. Requests for both `/` and
`/index.html` are therefore gated; the asset binding is called only after
a signed visitor cookie is verified.

## Local checks

```bash
npm install
npm test
npm run typecheck
npm run check:migration
npm run build
```

## D1 setup

Create separate preview and production databases, replace
`CONFIGURE_IN_HOSTING` with the selected environment's opaque database ID,
then apply:

```bash
npx wrangler d1 migrations apply calvin-myproperty-preview --local
npx wrangler d1 migrations apply calvin-myproperty-preview --remote
```

The initial migration is `migrations/0001_initial.sql`. Never point a
preview deployment at the production database.

## Required runtime configuration

Secrets:

- `VISITOR_SESSION_SECRET_CURRENT`
- `VISITOR_SESSION_SECRET_PREVIOUS` during key rotation only
- `OWNER_SESSION_SECRET_CURRENT`
- `OWNER_SESSION_SECRET_PREVIOUS` during key rotation only
- `OTP_PEPPER`
- `RESEND_API_KEY`

Non-secret variables:

- `OWNER_EMAIL` — Calvin's approved owner email
- `EMAIL_FROM` — a sender verified by the email provider
- `SITE_ORIGIN` — exact HTTPS production origin
- `CONSENT_TEXT_VERSION=2026-10-09-v1`
- `PRIVACY_POLICY_VERSION=2026-10-09-v1`
- `VISITOR_SESSION_DAYS=180`
- `OWNER_SESSION_HOURS=12`
- `OTP_TTL_MINUTES=10`

Use at least 32 cryptographically random bytes for each signing secret and
the pepper. Visitor and owner secrets must differ.

## Deployment verification

Deploy privately first. Confirm that:

1. page source for a clean browser contains no listing names, prices, images,
   or PropertyGuru links;
2. invalid Malaysian numbers and unchecked consent are rejected;
3. a successful submission creates lead, consent, and visit rows before
   granting access;
4. the same browser returns unlocked and a clean browser remains gated;
5. Calvin receives a one-time code and can search, annotate, update, and
   export leads;
6. direct `/index.html` and owner routes cannot bypass authorization.

Keep the prior Sites version ID. Roll back by deploying that saved version;
database migrations are forward-only, so this initial schema is retained.
