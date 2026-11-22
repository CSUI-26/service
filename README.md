# CSUI Zenith Service (`CSUI-26/service`)

Monorepo & Docker Compose stack for **CSUI Zenith** — combining the REST API (`@zenith/backend`), admin/self-service dashboard (`@zenith/frontend` at `/studio`), PostgreSQL 17, SeaweedFS S3 object storage, an Nginx reverse-proxy gateway, and zero-secret GHCR auto-deployments via Watchtower.

> **Note:** `apps/website` is a read-only Git submodule (`CSUI-26/website`, Astro landing page) kept for reference only. Do not modify it from this repository.

---

## Architecture

```text
Browser (https://zenith.csui.dev)
   │
   ▼
Vercel Edge (CSUI-26/website - Astro)
   ├── /                ──► Astro Landing Page (hosted on Vercel)
   ├── /studio/:path*   ──► Vercel Rewrite ──► Caddy + VPS Gateway ──► frontend (React + Nginx)
   ├── /api/:path*      ──► Vercel Rewrite ──► Caddy + VPS Gateway ──► backend (Fastify v5 :8080)
   └── /storage/:path*  ──► Vercel Rewrite ──► Caddy + VPS Gateway ──► seaweedfs (S3 :8333, 30d immutable cache)
```

### Services (`docker-compose.yml` — Production Default)

| Service | Purpose | Memory Limit | Exposure |
| --- | --- | --- | --- |
| `gateway` | Nginx reverse proxy (`/studio/`, `/api/`, `/storage/`, gzip + 30d S3 cache) | `64m` | `127.0.0.1:${ZENITH_GATEWAY_PORT:-8088}:80` |
| `backend` | Fastify v5 REST API + Drizzle ORM + SSO-UI auth (`ghcr.io/csui-26/service-backend:latest`) | `256m` | Internal only |
| `frontend` | React 19 + Vite dashboard built for `/studio/` (`ghcr.io/csui-26/service-frontend:latest`) | `64m` | Internal only |
| `postgres` | PostgreSQL 17.7 (app DB + SeaweedFS filer metadata) | `384m` | Internal only |
| `seaweedfs` | S3-compatible object storage & Filer UI | `384m` | Internal only |
| `storage-bootstrap` | One-shot init creating `zenith` (public-read) & `assets` buckets | — | Internal only |
| `watchtower` | Auto-pulls new GHCR images for `backend` & `frontend` every 120s | `64m` | Docker socket |
| `landing` | Optional (`profiles: ["with-landing"]`, disabled by default) | `64m` | Internal only |

---

## Initial Production Setup (VPS)

Prerequisites: Docker Engine + Compose v2, Bash, Python 3, OpenSSL, Caddy (reverse proxy to `127.0.0.1:8088`).

```bash
git clone https://github.com/CSUI-26/service.git /opt/CSUI26
cd /opt/CSUI26

./scripts/init-secrets.sh
```

Edit `/opt/CSUI26/.env` to match your public domain and VPS origin:

```env
ZENITH_GATEWAY_PORT=8088
SERVICE_URL=https://zenith.csui.dev/studio/auth/callback
FRONTEND_URL=https://zenith.csui.dev/studio
ALLOWED_ORIGINS=https://zenith.csui.dev,https://origin.vicky.id
S3_PUBLIC_URL=https://zenith.csui.dev/storage/zenith
ADMIN_NPM_LIST=2606888572
```

Start the production stack (pulls prebuilt images from `ghcr.io`):

```bash
sudo docker compose pull
sudo docker compose up -d --remove-orphans
./scripts/verify.sh
```

*(For local development with exposed Postgres/S3 ports and local builds, add `-f compose.dev.yml`: `docker compose -f docker-compose.yml -f compose.dev.yml up -d --build`.)*

---

## Zero-Secret CI/CD (`ghcr.io` + Watchtower)

1. Every push to `main` triggers `.github/workflows/deploy.yml`, which uses the built-in `GITHUB_TOKEN` (no manual GitHub Secrets required) to build and push:
   - `ghcr.io/csui-26/service-backend:latest`
   - `ghcr.io/csui-26/service-frontend:latest`
2. On the VPS, `watchtower` polls `ghcr.io` every 120 seconds for containers labeled `com.centurylinklabs.watchtower.enable=true` (`backend` and `frontend` only), pulls updated images, recreates them, and cleans up old images automatically.
3. **Config / Compose updates:** If you change `docker-compose.yml` or `config/gateway.conf`, run on the VPS:
   ```bash
   cd /opt/CSUI26
   git pull origin main
   sudo docker compose pull backend frontend
   sudo docker compose up -d --remove-orphans
   sudo docker compose restart gateway
   ```

---

## Database Migration & Seeding

Run Drizzle schema migrations and seed `data/academic.json`, `data/achievements.json`, `data/gallery.json`, and `data/activities.json` (if you place an untracked `data/members.json` locally, member records and photos will also be seeded to PostgreSQL and SeaweedFS S3 under `members/<uuid>.<ext>`):

```bash
sudo ./scripts/migrate-and-seed.sh
```

---

## Integrating with Vercel (Landing Page)

In `CSUI-26/website`, configure `vercel.json` rewrites pointing to your VPS origin domain:

```json
{
  "rewrites": [
    { "source": "/studio", "destination": "https://origin.vicky.id/studio/" },
    { "source": "/studio/:path*", "destination": "https://origin.vicky.id/studio/:path*" },
    { "source": "/api/:path*", "destination": "https://origin.vicky.id/api/:path*" },
    { "source": "/storage/:path*", "destination": "https://origin.vicky.id/storage/:path*" }
  ]
}
```

---

## Migrating to Another Server

All persistent state lives in bind-mounted directories controlled by `ZENITH_RUNTIME_DIR` (defaults to `.`):

- `postgres/` — PostgreSQL data & SeaweedFS filer metadata
- `seaweed/` — SeaweedFS master, volume, and filer data
- `secrets/` — Generated `s3.json` and `filer.toml`
- `.env` — Credentials and domain configuration

To migrate:

1. Stop the stack on the old server:
   ```bash
   sudo docker compose down
   ```
2. Copy `postgres/`, `seaweed/`, `secrets/`, and `.env` **together** to the new server.
3. Update `.env` if the domain changed, then start:
   ```bash
   sudo docker compose pull && sudo docker compose up -d
   ```
