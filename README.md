# hitpoints.eu CMS

Self-hosted wiki CMS for hitpoints.eu: Markdown articles per universe, continuity badges, and a small admin editor. Designed to run on Unraid with Docker Compose and nginx in front of Node.

Universes in this tree: The Witcher, Dune, Warcraft, The Lord of the Rings.

## Local preview

Requires Node 20 or newer. Install dependencies, seed content, then launch the server from package.json scripts.

Seed copies handoff Markdown into data/content (skips if already present).

Default port is 3000. If that port is busy, use 3040.

Local preview credentials live in the env file (ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET, PORT). The values shipped for this box are preview-only. Unraid must change the user, password, and session secret before the host is public. Never keep the preview password on Unraid.

When PORT is 3040:
- public hub: http://127.0.0.1:3040/
- admin: http://127.0.0.1:3040/admin  (redirects to /admin/login until signed in)
- health: http://127.0.0.1:3040/health

## How /admin works

/admin is session-gated (cookie hp.sid, httpOnly, SameSite=Lax).

1. Unauthenticated visits to /admin redirect to /admin/login with a next= query.
2. Sign-in posts username and password. The server compares them to ADMIN_USER and ADMIN_PASSWORD from the environment.
3. On success, session.admin is set for 7 days. You land on the article list.
4. New article, Edit, View, Delete. The editor is Markdown plus title, slug, universe, category, badges, lede, infobox, see-also, and image uploads. Save writes data/content/<universe>/<slug>.md immediately; the public page updates on the next request. No build step.
5. status: draft hides a page from the public site but keeps it in admin.
6. POST /admin/logout destroys the session.
7. Images land in data/uploads/ and are served at /uploads/ (png, jpg, webp, gif, svg; 12 MB cap).

One shared admin password is the whole gate. Put nginx (or Unraid reverse proxy) in front, use HTTPS, and set COOKIE_SECURE=true so the session cookie is HTTPS-only.

## Content layout

    data/content/<universe>/<slug>.md   articles (hub.md is the universe homepage)
    data/uploads/                       images
    seed/content/                       baked-in copy used when a volume is empty
    seed/uploads/

Each article is gray-matter Markdown. Wiki links use double-bracket slug or slug|label.

The seed script reads ../hitpoints-handoff (Witcher Priority A, Dune wave 2, Warcraft Priority A, LotR Priority A), normalizes slugs and universe, and writes data/content plus seed/content.

On first boot, if CONTENT_DIR is empty (typical Unraid volume), the app copies seed/content into it.

## Unraid docker compose

Appdata lives under /mnt/user/appdata/hitpoints. Markdown and uploads persist there; the container can be recreated without losing edits.

1. Copy this project onto the Unraid box.
2. Create data dirs: /mnt/user/appdata/hitpoints/content and /mnt/user/appdata/hitpoints/uploads
3. Create a .env next to docker-compose.yml from .env.example. Change every secret. Unraid must not keep the local preview password. Set ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET, PORT=3000, COOKIE_SECURE=true.
4. Set HITPOINTS_DATA=/mnt/user/appdata/hitpoints and bring the compose stack up with a build (see docker-compose.yml).

Compose services:

- app: Node CMS. Container port 3000, not published to the host. CONTENT_DIR=/data/content, UPLOADS_DIR=/data/uploads. Healthcheck hits /health.
- nginx: reverse proxy. Host 8080 maps to container 80, which proxies to app:3000. Config: nginx/nginx.conf.

Volumes from docker-compose.yml:

    ${HITPOINTS_DATA:-./data}/content  ->  /data/content
    ${HITPOINTS_DATA:-./data}/uploads  ->  /data/uploads

On Unraid that is /mnt/user/appdata/hitpoints/content and /mnt/user/appdata/hitpoints/uploads.

Nginx is included so Cloudflare / SWAG / Nginx Proxy Manager can sit in front of host port 8080. To bind LAN port 80 instead, change the nginx ports mapping to 80:80 (Unraid own UI often already owns 80).

### Reverse proxy and HTTPS

Terminate TLS on Unraid reverse proxy and send traffic to http://UNRAID-IP:8080. Forward Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto. The app sets trust proxy. Set COOKIE_SECURE=true.

The bundled nginx/nginx.conf already forwards those headers and sets client_max_body_size 32m for image uploads.

### First-boot seed

The image ships seed/content. If /data/content is an empty appdata folder, ensureSeed copies the bundled Markdown in. After that, admin edits only touch the volume. Rebuilds do not clobber your pages.

Rebuild with docker compose (up + build). This does not wipe /mnt/user/appdata/hitpoints/content unless you delete that folder yourself.

## Package scripts

- start: node src/server.js
- dev: node --watch src/server.js
- seed: ingest handoff Markdown into data/content

## Layout

    src/server.js          HTTP entry
    src/config.js          universes, paths, env
    src/content.js         Markdown CRUD plus first-boot seed
    src/routes/public.js   / and /wiki/:universe/:slug
    src/routes/admin.js    /admin routes
    src/views/             EJS (public plus admin)
    public/                CSS, logo, admin.js
    nginx/nginx.conf
    Dockerfile
    docker-compose.yml

## Unraid security

- Change ADMIN_PASSWORD and SESSION_SECRET before the host is reachable from the internet.
- Do not commit the env file.
- Keep /admin off the public internet if you can (VPN or an IP allowlist).
- COOKIE_SECURE=true once you are on HTTPS.
- Default local login is ADMIN_USER=bram and ADMIN_PASSWORD=hitpoints-dev. Must be changed on Unraid.
