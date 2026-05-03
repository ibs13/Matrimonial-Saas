# Release Checklist

Use this checklist before every production release. Work through it top to bottom — items are ordered by dependency.

---

## 1. Code Quality

- [ ] All CI pipelines pass on `main`:
  - [ ] API: `dotnet build -c Release` — 0 errors
  - [ ] Web: `npm run type-check` — 0 TypeScript errors
  - [ ] Web: `npm run lint` — 0 ESLint errors
  - [ ] Web: `npm run build` — successful Next.js build
- [ ] No `TODO` or `FIXME` comments in new code
- [ ] No hardcoded credentials or API keys in committed code

---

## 2. Database

- [ ] All new migrations reviewed for:
  - [ ] Correct `Up()` and `Down()` methods
  - [ ] No breaking schema changes on populated tables (avoid column renames; use add + migrate data + drop old)
  - [ ] Indexes present for new FK columns and filter columns
- [ ] Snapshot file (`AppDbContextModelSnapshot.cs`) reflects all migrations
- [ ] Database backed up before applying migrations
- [ ] Migrations applied to staging/test environment successfully
- [ ] Migrations ready to apply to production (command prepared, not yet run)

---

## 3. Environment Configuration

- [ ] Production `.env` / environment variables set:
  - [ ] `JWT_SECRET` ≥ 32 chars, not the development value
  - [ ] `POSTGRES_PASSWORD` and `MONGO_PASSWORD` set to strong values
  - [ ] `NEXT_PUBLIC_API_URL` points to production API with HTTPS
  - [ ] `PGADMIN_PASSWORD` and `ME_BASICAUTH_PASSWORD` changed from defaults
- [ ] `Anthropic:ApiKey` set (if AI explanations are needed)
- [ ] Email sender configured (SendGrid / SES API key set)
- [ ] Photo storage configured (S3 / R2 credentials set)

---

## 4. Security Review

- [ ] No Swagger UI exposed publicly in production
- [ ] HTTPS enforced (HSTS enabled)
- [ ] Admin-only routes confirmed inaccessible to regular users (test with a User-role JWT)
- [ ] Rate limiting confirmed active on `/api/auth/*` routes
- [ ] Chat banned word list reviewed and configured for the target audience

---

## 5. Functional Testing

Complete the flows in `docs/testing/e2e-flow-checklist.md`. At minimum:

- [ ] **Auth flow** — Register, verify email, login, logout, token refresh
- [ ] **Profile flow** — Create, fill all sections, upload photo, submit for review
- [ ] **Admin profile flow** — Approve profile, approve photo
- [ ] **Search flow** — Search with multiple filters, view a result profile
- [ ] **Interest flow** — Send interest, accept, conversation created
- [ ] **Chat flow** — Send and receive messages, read receipts, unread badge
- [ ] **Membership flow** — Create order, submit payment, admin verify, plan updated
- [ ] **Support flow** — Create ticket, admin replies, close ticket
- [ ] **Chat moderation** — Report message, admin dismisses, admin closes conversation
- [ ] **Admin suspension** — Suspend profile, verify it disappears from search

---

## 6. Performance Spot-Check

- [ ] Search with no filters returns results in < 500ms on production hardware
- [ ] Profile load (MongoDB read) completes in < 300ms
- [ ] Chat thread load (50 messages) completes in < 500ms
- [ ] Match recommendations load in < 2s (AI explanations may take longer)

---

## 7. Deploy

- [ ] Apply database migrations: `dotnet ef database update`
- [ ] Build and deploy API container
- [ ] Build and deploy Web container (with correct `NEXT_PUBLIC_API_URL` build arg)
- [ ] Health check: `GET /health/ready` returns 200
- [ ] Frontend loads and auth flow works

---

## 8. Post-Deploy Verification

- [ ] Login works with an existing account
- [ ] A profile search returns results
- [ ] Admin dashboard loads with correct metrics
- [ ] API logs show no unexpected errors (check `docker compose logs api`)
- [ ] Monitor for 15 minutes after deploy — no spike in 500 errors

---

## 9. Rollback Plan

If a critical issue is found after deploy:

1. Revert the Docker image tag to the previous version and redeploy
2. If migrations were applied, check if the `Down()` method is safe to run:
   ```bash
   dotnet ef database update <previous-migration-name>
   ```
3. Notify users if there is extended downtime (> 15 minutes)

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Admin (QA) | | | |
| Deployer | | | |
