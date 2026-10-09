# Deployment guide

This project ships as three containers via `docker-compose.yml`:

- `db` — PostgreSQL 16 (data in the `pgdata` volume)
- `api` — FastAPI with uvicorn; runs `alembic upgrade head` before serving
- `web` — nginx serving the built SPA on port 80, proxying `/api` to the API

## 1. Prerequisites

- Docker Engine 24+ with Docker Compose v2 (`docker compose version`).
- Ports 80, 8000 and 5432 free (or remap in `.env`/compose).

## 2. Configure environment

```bash
cp .env.example .env            # repo root: compose + postgres variables
cp backend/.env.example backend/.env   # API settings (secrets below)
```

Non-negotiable production settings in `backend/.env`:

| Variable            | Must be                                                            |
|---------------------|---------------------------------------------------------------------|
| `ENVIRONMENT`       | `production` (the API refuses to boot with `mock` payment or a weak `SECRET_KEY` in this mode) |
| `SECRET_KEY`        | random string of **32+ chars** (`python -c "import secrets;print(secrets.token_urlsafe(48))"`) |
| `PAYMENT_PROVIDER`  | one of `kbzpay` / `wavepay` / `cbpay` / `bank_transfer`, **never** `mock` |
| `WEBHOOK_SECRET`    | long random string used to HMAC-sign provider webhooks           |
| `CORS_ORIGINS`      | comma-separated origins of your deployed frontend                |
| `ALLOWED_HOSTS`     | your domain(s), or `*` if behind a proxy that sets `X-Forwarded-Host` |

The compose file overrides `DATABASE_URL` to point the API at the `db` service, so the `DATABASE_URL` inside `backend/.env` can stay as the local example.

## 3. Build & start

```bash
docker compose up -d --build
docker compose ps            # wait until db is healthy, then api/web are up
```

- Web app: `http://<host>/`
- API docs: `http://<host>:8000/docs`
- Health: `http://<host>:8000/api/v1/health` and `/api/v1/health/ready`

### Seeding initial data

The API only runs migrations on boot; it does **not** seed. Run once against the live DB:

```bash
docker compose exec api python -m app.seed
```

or point a one-off container at the same database URL. Without seed data there are no cities/routes/trips to search.

### Applying migrations manually

```bash
docker compose exec api alembic upgrade head
```

## 4. TLS / reverse proxy

nginx in the `web` container listens on port 80 only. Terminate TLS in front of it — e.g. Caddy or the Docker nginx-proxy/acme-companion stack — and proxy `http://<host>` → the `web` container's port 80. No code changes required; relative `/api/` URLs work behind any host.

## 5. Real payment providers

Stubs exist for KBZPay, WavePay, CBPay and bank transfer. Hook-up work per provider (this repo ships the ids, HMAC webhook verification and idempotency plumbing, but network calls are stubbed):

- Implement the adapter's `initiate`/`verify`/`refund` calls in `backend/app/services/payments/providers.py`.
- Set the merchant/secret env values, `PAYMENT_PROVIDER=<name>`.
- Point the provider console's webhook URL to `https://<host>/api/v1/payments/webhooks/<provider>` and sign with `WEBHOOK_SECRET`.

Dev/staging can keep `PAYMENT_PROVIDER=mock` + `PAYMENT_MOCK_ENABLED=true` with `ENVIRONMENT=staging`; `production` always refuses it.

## 6. Backups

```bash
docker compose exec db pg_dump -U booking -d car_tickets | gzip > backup_$(date +%F).sql.gz
```

## 7. Health checks & monitoring

`ReservationExpirer` releases expired seat holds every 60 s (skipped only when `ENVIRONMENT=test`). Configure your monitoring on `/api/v1/health/ready`. Structured logs go to stdout — ship them with your logging driver.

## 8. Upgrades

```bash
git pull
docker compose build --pull
docker compose up -d          # api runs alembic upgrade head automatically
docker compose exec api alembic current   # verify schema revision
```