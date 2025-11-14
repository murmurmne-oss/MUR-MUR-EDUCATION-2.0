# Production Deployment Guide

Follow these steps to run the Mur Mur Education stack on the production server (`51.195.117.202`) with HTTPS fronted by Caddy.

## 1. Prepare the server

```bash
ssh root@51.195.117.202
apt-get update && apt-get install -y docker.io docker-compose-plugin git
systemctl enable --now docker
```

Create a non-root user if required and copy the SSH key.

## 2. Clone the repository

```bash
mkdir -p /opt/murmur && cd /opt/murmur
git clone https://<your-git>/tg-miniapp-bot.git .
```

## 3. Configure environment

```bash
cd deploy
cp env.example .env
# edit .env and fill in secrets (TELEGRAM tokens, DATABASE_URL, etc.)
```

Mandatory admin security variables:

* `ADMIN_SESSION_SECRET` – any long random string used to sign admin sessions.
* Either:
  * `ADMIN_USERNAME` + `ADMIN_PASSWORD` for login/password access, or
  * `ADMIN_ALLOWED_IDS` (comma-separated list of Telegram IDs) for ID-based access.
* Optional fallback: `ADMIN_ACCESS_TOKEN` (legacy one-time code).

Frontend variables for the mini app:

* `NEXT_PUBLIC_API_BASE_URL` – points to the backend API (`https://api.murmurmne.com`).
* `NEXT_PUBLIC_TELEGRAM_STARS_PER_EURO` – number of Telegram Stars that correspond to 1 EUR (used to convert Euro prices to Stars inside the mini app; defaults to 60).
* `NEXT_PUBLIC_TELEGRAM_SDK_URL` – path or URL to the Telegram WebApp SDK (by default `/telegram-web-app.js`). Place the SDK file under `apps/miniapp/public` if you want to serve it from your own domain.

## 4. Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

The first start runs Prisma migrations automatically (`npx prisma migrate deploy`) before launching the backend. Check logs if the command fails.

## 5. Verify services

* `https://api.murmurmne.com/health` → should return the API health response (add the endpoint if missing).
* `https://mini.murmurmne.com` → mini application loads.
* `https://admin.murmurmne.com` → admin panel loads (login screen appears).

Use `docker compose -f docker-compose.prod.yml logs -f <service>` to tail logs.

## 6. Configure Telegram webhook

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://api.murmurmne.com/payments/telegram-stars/webhook"
```

Re-run the command whenever the API domain changes.

## 7. Updating the stack

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Use `docker compose -f docker-compose.prod.yml down` to stop all services.

## 8. Optional services

* **Redis** – set `REDIS_URL` in `.env` and add a Redis service to the compose file.
* **SMTP** – fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` when email notifications are implemented.

## 9. Backups and monitoring

* Database is managed separately (OVH Cloud DB). Ensure backups are enabled there.
* Expose `/metrics` or integrate logging (Grafana/Prometheus) as needed.

## Troubleshooting

* **Caddy certificates** – the first run may take a minute while certificates are issued. Check `caddy` logs.
* **Prisma migrations** – if migrations fail, run them manually inside the backend container:  
  `docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy`.
* **Telegram payments** – verify signed payloads and check backend logs on `payment.telegram-stars` activity.


