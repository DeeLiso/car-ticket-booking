# Car Ticket Booking System — Progress

Premium car & bus ticket booking platform. React/Vite/TS frontend + FastAPI backend.

## Milestones

- [x] **Phase 1** — Project skeleton, venv, requirements pinned (FastAPI 0.115.6, SQLAlchemy 2.0.36, alembic 1.14.1).
- [x] **Phase 2** — Core infra: Settings, JWT + password hashing (pwdlib/argon2), AppError hierarchy, request middleware, rate limiter, DB engine with SQLite WAL pragmas + Postgres pool opts.
- [x] **Phase 3** — All 20 ORM models + enums; Alembic initial migration `076e25fa10e1` applied.
- [x] **Phase 4** — Auth + RBAC (register/login/refresh rotation/logout/change-password, roles ADMIN/BUS_OPERATOR/PASSENGER).
- [x] **Phase 5a** — Catalog/trips: cities, routes, buses (operator-owned), trip CRUD with bus-overlap check, seat map.
- [x] **Phase 5b** — Booking engine: per-(trip, seat) inventory as single source of truth, atomic conditional `UPDATE ... WHERE status='AVAILABLE'` + `SELECT ... FOR UPDATE`, expired-hold release (lazy + background expirer thread), booking create/confirm/cancel/refund path.
- [x] **Phase 5c** — Payments: provider adapter (Mock dev-only + KBZPay/WavePay/CBPay/BankTransfer stubs), HMAC-signed webhooks, idempotency, server-derived amounts, refunds (REQUESTED→APPROVED→PROCESSED, auto-settle booking/payment when fully refunded).
- [x] **Phase 5d** — QR tickets: deterministic signed reference (HMAC over ticket id, no PII, regenerable), sha256 token hash, single-use validation, QR PNG + ReportLab PDF.
- [x] **Phase 5e** — Admin + operator dashboards, audit logs, reports, settings CRUD.
- [x] **Phase 5f** — Seed script (`python -m app.seed`): 8 cities, 15 routes, 8 buses, 250 trips, admin/operator users.
- [x] **Backend tests green** — `46 passed` (`backend` → `..\.venv\Scripts\python.exe -m pytest`). Includes 5-thread single-winner concurrency test.
- [x] **Phase 6** — React/Vite/TS frontend scaffold + design system + routing + auth store.
- [x] **Phase 7** — Frontend: trip search, seat map, checkout flow.
- [x] **Phase 8** — Frontend: booking management, mock payment flow, ticket view (QR/PDF).
- [x] **Phase 9** — Operator portal (buses/trips/manifest/scan validate).
- [x] **Phase 10** — Admin portal (dashboard/operators/routes/buses/trips/refunds/reports/audit).
- [ ] **Phase 11** — Docker (compose + Dockerfiles), README, deployment docs.
- [ ] **Phase 12** — Polish, error states, loading skeletons, a11y.

## Backend notes

- Local dev runs on SQLite (`backend/.env` → `sqlite:///./dev.db`); production target is PostgreSQL. `alembic upgrade head` for prod schema; dev convenience `create_all` on boot for SQLite only.
- `SessionLocal` uses `autoflush=True` (SQLAlchemy default). Keep this: earlier `autoflush=False` caused a bug where `refund.status = PROCESSED` wasn't flushed before the aggregate `sum(amount)` — refunds silently never settled booking/payment to `REFUNDED`.
- `update()` statements with datetime criteria (`hold_expires_at < now`) MUST use `.execution_options(synchronize_session=False)`, otherwise SQLAlchemy evaluates the WHERE in Python against identity-map objects and hits naive-vs-aware `TypeError` (concurrency bug).
- Config uses `cors_origins_str` / `allowed_hosts_str` (pydantic-settings JSON-parses `list` fields); properties `cors_origins`/`allowed_hosts` decode them.
- Rate limiter is skipped when `ENVIRONMENT=test`.
- Seed creds (dev): admin `admin@example.com` / `Admin@123`; operators `<company>-op@example.com` / `Operator@123`. Tests create their own (`admin@test.com`/`operator@test.com`, password `Passw0rd123`).

## Frontend notes

- Vite + React 18 + TypeScript + Tailwind + Zustand (auth) + TanStack Query (data) + react-hook-form/zod (forms).
- Axios instance (`src/services/api.ts`) with access/refresh rotation, single-flight refresh, normalized `ApiError`.
- Routes: `/` landing, `/search`, `/trips/:id` + `/checkout` (auth), `/account` (bookings/tickets), `/operator/*`, `/admin/*` (guards in `src/components/layout/guards.tsx`).
- Typecheck: `npm run typecheck`/`build` use `tsc --noEmit`. Single `tsconfig.json` (no `-b`, no project references) — `tsc -b` with a `composite` reference emits `vite.config.js`/`.d.ts`/`.tsbuildinfo` into the repo root on TS 5.9.
- Operator/admin types (`OperatorStats`, `OperatorTripRow`, `ManifestPassenger`, `OperatorTripManifest`) live in `src/types/index.ts`.

## Test suite structure

- `tests/conftest.py`: sets `DATABASE_URL` → `tests/dev_test.db`, `ENVIRONMENT=test` before app import; session-scoped `seed_users` (one admin/operator/passenger); function fixtures `client/db/admin/operator/passenger/cities/route/bus/trip`; helpers `auth_headers`, `register_row`, `login`, `seat_ids`.
- Files: `test_auth.py`, `test_trips.py`, `test_bookings.py`, `test_concurrency.py`, `test_payments.py`, `test_tickets.py`, `test_admin.py`.
- Run: `cd backend; $env:PYTHONPATH='.'; ..\.venv\Scripts\python.exe -m pytest` (delete `tests/dev_test.db` for a clean run).

## Next step

Phase 6–10 are complete; backend (46 tests) and frontend (`npm run typecheck` + build) are green. Remaining work: **Phase 11** (Docker: compose + Dockerfiles, root README, deployment docs), **Phase 12** (polish: loading skeletons/error states/a11y), and an initial `.gitignore` (repo has no commits yet).