# Car Ticket Booking

Premium car & bus ticket booking platform for Myanmar. React/Vite/TypeScript frontend with a FastAPI + SQLAlchemy backend — search trips, book seats transactionally, pay through a provider adapter (mock for dev), and issue single-use QR tickets.

## Features

- **Trip search** — cities / routes / buses with filters (price, departure window, bus type) and pagination.
- **Seat map & booking** — per-(trip, seat) inventory as the single source of truth; atomic conditional seat hold; expired-hold auto-release (lazy + background expirer); booking create → confirm → cancel → refund lifecycle.
- **Payments** — provider adapter (Mock dev-only, plus KBZPay / WavePay / CBPay / BankTransfer stubs), HMAC-signed webhooks, idempotency, server-derived amounts, refund workflow (REQUESTED → APPROVED → PROCESSED).
- **QR tickets** — deterministic signed ticket references (HMAC over ticket id, no PII, regenerable), sha256 token hash, single-use validation, QR PNG + PDF download.
- **Portals** — passenger dashboard, operator portal (buses / trips / manifests / scan-validate), admin dashboard (operators / routes / buses / trips / refunds / reports / audit log).
- **Auth & RBAC** — JWT access/refresh rotation, argon2 password hashing, roles `PASSENGER`, `BUS_OPERATOR`, `ADMIN`.

## Tech stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS, TanStack Query, Zustand, react-hook-form + zod |
| Backend  | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 + pydantic-settings |
| Database | PostgreSQL (prod) / SQLite (local dev) |
| Auth     | PyJWT (rotate-able refresh tokens), pwdlib/argon2 |
| Payments | In-process adapter (Mock for dev) + provider stubs |
| Tests    | pytest (backend), `tsc --noEmit` + `vite build` (frontend) |

## Project layout

```
car-ticket-booking/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # HTTP routes
│   │   ├── core/               # config, security, deps, rate limiting
│   │   ├── db/                 # engine + sessions
│   │   ├── models/             # 20 SQLAlchemy models
│   │   ├── schemas/            # pydantic request/response schemas
│   │   ├── services/           # business logic + payment providers
│   │   ├── tasks/              # reservation expirer background thread
│   │   ├── utils/              # qr, pdf, pagination, time helpers
│   │   └── seed.py             # dev seed script
│   ├── alembic/                # DB migrations
│   ├── tests/                  # pytest suite (46 tests)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # common UI, layout, seats, dashboard
│   │   ├── pages/              # public / auth / passenger / operator / admin
│   │   ├── services/           # axios instance + typed API endpoints
│   │   ├── store/              # zustand auth store
│   │   ├── types/              # API types
│   │   └── utils/
│   └── vite.config.ts          # dev proxy /api → :8000
├── docker-compose.yml
├── backend/Dockerfile / frontend/Dockerfile
├── frontend/nginx.conf
├── .env.example
├── docs/DEPLOYMENT.md
└── PROJECT_PROGRESS.md
```

## Quickstart (local development)

Prerequisites: Python 3.12+, Node 20+.

### 1. Backend

```powershell
# from repo root
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd backend
pip install -r requirements.txt
Copy-Item .env.example .env     # then edit values
python -m app.seed              # seed cities/routes/buses/trips/users
python -m uvicorn app.main:app --reload --port 8000
```

- API docs: <http://localhost:8000/docs>
- Local dev uses SQLite; prod target is PostgreSQL (`alembic upgrade head`).

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to `http://localhost:8000`.

### 3. Verification

```powershell
# backend tests (from backend/)
$env:PYTHONPATH='.'; ..\.venv\Scripts\python.exe -m pytest

# frontend lint + typecheck + build (from frontend/)
npm run lint
npm run typecheck
npm run build
```

## Docker (compose)

```powershell
docker compose up -d --build
```

- `postgres` — database on `:5432`
- `api` — FastAPI on `:8000` (docs at `:8000/docs`)
- `web` — nginx serving the built SPA on `:80`, proxying `/api` → `api:8000`

The API container runs `alembic upgrade head` on boot. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production notes.

## Environment variables

Copy `.env.example` → `backend/.env` (backend reads `.env` from its own working directory; the compose file injects the same values). Key variables:

| Variable | Purpose |
|----------|---------|
| `ENVIRONMENT` | `development` / `staging` / `production` (production refuses weak `SECRET_KEY` and the mock payment provider) |
| `DATABASE_URL` | `postgresql+psycopg://user:pass@host/db` or `sqlite:///./dev.db` |
| `SECRET_KEY` | JWT signing secret — set a strong random value |
| `PAYMENT_PROVIDER` | `mock` (dev only) or `kbzpay` / `wavepay` / `cbpay` / `bank_transfer` |
| `WEBHOOK_SECRET` | shared secret for HMAC-signed payment webhooks |
| `CORS_ORIGINS` | comma-separated allowed browser origins |

Frontend: `VITE_API_BASE` (defaults to `/api/v1`).

## Seed data & dev credentials

`python -m app.seed` creates 8 cities, 15 routes, 8 buses, 250 trips and two users:

- Admin: `admin@example.com` / `Admin@123`
- Operators: `<company>-op@example.com` / `Operator@123`

## Payments in development

Mock provider is enabled by default (`PAYMENT_PROVIDER=mock`). In the checkout UI, complete payment with the mock confirm step; no real money moves. The mock provider is **rejected** when `ENVIRONMENT=production`.

## Tests

Backend tests live in `backend/tests/` and run against an isolated SQLite file (`tests/dev_test.db`). Delete that file for a clean run.

## License / status

Phases 1–12 complete — backend + all three portals + Docker/deployment docs + polish/a11y + ESLint. See `PROJECT_PROGRESS.md`.