# CSUI Zenith (`CSUI26`)

Monorepo & Docker Compose stack for **CSUI Zenith** — combining the REST API (`@zenith/backend`), admin/self-service dashboard (`@zenith/frontend` at `/studio`), PostgreSQL 17, SeaweedFS S3 object storage, and an Nginx reverse-proxy gateway.

> **Note:** `apps/website` is a read-only Git submodule (`CSUI-26/website`, Astro landing page) kept for reference only. Do not modify it from this repository.

---

## Architecture

```text
Browser (https://zenith.csui.dev)
   │
   ▼
Vercel Edge (CSUI-26/website - Astro)
   ├── /                ──► Astro Landing Page (hosted on Vercel)
   ├── /studio/:path*   ──► Vercel Rewrite ──► VPS Gateway ──► frontend (React + Nginx)
   ├── /api/:path*      ──► Vercel Rewrite ──► VPS Gateway ──► backend (Fastify v5 :8080)
   └── /storage/:path*  ──► Vercel Rewrite ──► VPS Gateway ──► seaweedfs (S3 :8333)
```

### Services (`compose.yml`)

| Service | Purpose | Internal Address |
| --- | --- | --- |
| `gateway` | Nginx reverse proxy (`/studio/`, `/api/`, `/storage/`) | `gateway:80` |
| `backend` | Fastify v5 REST API + Drizzle ORM + SSO-UI auth | `backend:8080` |
| `frontend` | React 19 + Vite dashboard (built with `base: /studio/`) | `frontend:80` |
| `postgres` | PostgreSQL 17.7 (app DB + SeaweedFS filer metadata) | `postgres:5432` |
| `seaweedfs` | S3-compatible object storage & Filer UI | `seaweedfs:8333`, `seaweedfs:8888` |
| `storage-bootstrap` | One-shot init creating `zenith` (public-read) & `assets` buckets | — |
| `landing` | Optional (`profiles: ["with-landing"]`, disabled by default) | `landing:80` |

---

## Initial VPS Setup

Prerequisites: Docker Engine + Compose v2, Bash, Python 3, OpenSSL.

```bash
git clone https://github.com/VickyIbr/CSUI26.git /opt/CSUI26
cd /opt/CSUI26

./scripts/init-secrets.sh
```

Edit `/opt/CSUI26/.env` to match your public domain (e.g. `https://zenith.csui.dev`) and VPS origin:

```env
SERVICE_URL=https://zenith.csui.dev/studio/auth/callback
FRONTEND_URL=https://zenith.csui.dev/studio
ALLOWED_ORIGINS=https://zenith.csui.dev,https://origin.vicky.id
S3_PUBLIC_URL=https://zenith.csui.dev/storage/zenith
ADMIN_NPM_LIST=2606888572
```

Validate and start the stack:

```bash
./scripts/validate-config.sh
sudo docker compose --env-file .env -f compose.yml -f compose.dev.yml up -d --build
./scripts/verify.sh
```

---

## Updating & Redeploying on VPS

```bash
cd /opt/CSUI26
git pull origin main
sudo docker compose --env-file .env -f compose.yml -f compose.dev.yml up -d --build --remove-orphans
sudo docker compose --env-file .env -f compose.yml -f compose.dev.yml restart gateway
```

> `gateway` mounts `./config/gateway.conf` directly, so restarting `gateway` ensures any Nginx config changes are reloaded.

---

## Database Migration & Seeding

Run Drizzle schema migrations and seed `data/academic.json`, `data/members.json`, and `data/achievements.json` (automatically downloads and uploads member photos to SeaweedFS S3 under `members/<uuid>.<ext>`):

```bash
sudo ./scripts/migrate-and-seed.sh
```

---

## Integrating with Vercel (Landing Page)

In the Astro landing page repository (`CSUI-26/website`), add `rewrites` to `vercel.json` pointing to your VPS origin domain (HTTPS via Cloudflare Proxy / Caddy):

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

How it works:
1. `/` is served directly from Vercel Edge, so the landing page stays online even if the VPS is down.
2. `/studio/*`, `/api/*`, and `/storage/*` are proxied same-origin by Vercel to the VPS `gateway`, keeping `HttpOnly; Secure; SameSite=Lax` auth cookies and SSO-UI callbacks working seamlessly on `https://zenith.csui.dev`.

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
   sudo docker compose --env-file .env -f compose.yml -f compose.dev.yml down
   ```
2. Copy `postgres/`, `seaweed/`, `secrets/`, and `.env` **together** to the new server *(PostgreSQL and SeaweedFS must be backed up together so object metadata and volume bytes stay in sync)*.
3. Update `.env` on the new server if the domain/IP changed, then start:
   ```bash
   sudo docker compose --env-file .env -f compose.yml -f compose.dev.yml up -d --build
   ```
