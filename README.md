# hitpoints.eu CMS

Self-hosted wiki CMS for [hitpoints.eu](https://hitpoints.eu): Markdown articles per universe, continuity badges, and a small admin editor.

**Primary deploy path:** Unraid Docker tab → Add Container. Node runs inside the image. There is no Compose stack, no nginx sidecar, and no Node install on the host.

Source: [https://github.com/Rahkun3/Hitpoints](https://github.com/Rahkun3/Hitpoints) (`dev` branch).

Universes in this tree: The Witcher, Dune, Warcraft, The Lord of the Rings.

## Unraid: Add Container

Appdata for Markdown and uploads lives under `/mnt/user/appdata/hitpoints`. The git clone used to build the image lives under `/mnt/user/appdata/hitpoints-src`. Recreating the container does not wipe edits as long as those two appdata folders stay.

Do **not** map host port 80. Unraid's own UI already owns it. Publish **8080 → 3000** and put SWAG / Nginx Proxy Manager / Cloudflare in front of 8080.

### 1. Clone and build the image

On the Unraid box (SSH or Unraid terminal):

```bash
git clone -b dev https://github.com/Rahkun3/Hitpoints.git /mnt/user/appdata/hitpoints-src
mkdir -p /mnt/user/appdata/hitpoints/content /mnt/user/appdata/hitpoints/uploads
cd /mnt/user/appdata/hitpoints-src
docker build -t hitpoints .
```

Stay on `dev`. Do not merge to `main`. The image contains Node 20; the host does not need Node.

### 2. Add Container fields

Docker tab → Add Container. Fill in:

| Field | Value |
| --- | --- |
| Name | `hitpoints` |
| Repository | `hitpoints` |
| Network Type | Bridge |
| Restart policy | unless-stopped |
| Port | Host `8080` → Container `3000` (TCP) |
| Path (content) | Host `/mnt/user/appdata/hitpoints/content` → Container `/data/content` |
| Path (uploads) | Host `/mnt/user/appdata/hitpoints/uploads` → Container `/data/uploads` |

Environment variables (change the secrets before the host is public):

| Variable | Example | Notes |
| --- | --- | --- |
| `ADMIN_USER` | `bram` | Admin login name |
| `ADMIN_PASSWORD` | `change-me-now` | **Change this.** Do not keep the example password. |
| `SESSION_SECRET` | `replace-with-a-long-random-string` | Long random string; change it. |
| `PORT` | `3000` | Container listen port. Leave at 3000; the host mapping is 8080. |
| `COOKIE_SECURE` | `false` | Set `true` once HTTPS is in front of the container. |
| `CONTENT_DIR` | `/data/content` | Must match the content path mapping. |
| `UPLOADS_DIR` | `/data/uploads` | Must match the uploads path mapping. |

Apply / Start. LAN check: `http://UNRAID-IP:8080/` (hub), `http://UNRAID-IP:8080/admin` (editor), `http://UNRAID-IP:8080/health` (health).

### First-boot seed

The image ships `seed/content`. If `/data/content` is an empty appdata folder, the app copies the bundled Markdown in on first boot. After that, admin edits only touch the volume. Rebuilding the image does not clobber pages unless you delete `/mnt/user/appdata/hitpoints/content` yourself.

### Reverse proxy and HTTPS

Terminate TLS on Unraid reverse proxy (SWAG, Nginx Proxy Manager, Cloudflare) and send traffic to `http://UNRAID-IP:8080`. Forward `Host`, `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto`. The app sets `trust proxy`. Set `COOKIE_SECURE=true` once you are on HTTPS so the session cookie is HTTPS-only.

Do **not** bind host port 80. Unraid's web UI typically already uses it. Keep the container on 8080→3000.

### Rebuild

After pulling `dev`:

```bash
cd /mnt/user/appdata/hitpoints-src
git pull
docker build -t hitpoints .
```

Then stop/start the existing `hitpoints` container (same name, same volume maps). Appdata content and uploads stay.

## How /admin works

`/admin` is session-gated (cookie `hp.sid`, httpOnly, SameSite=Lax).

1. Unauthenticated visits to `/admin` redirect to `/admin/login` with a `next=` query.
2. Sign-in posts username and password. The server compares them to `ADMIN_USER` and `ADMIN_PASSWORD` from the environment.
3. On success, `session.admin` is set for 7 days. You land on the article list.
4. New article, Edit, View, Delete. The editor is Markdown plus title, slug, universe, category, badges, lede, infobox, see-also, and image uploads. Save writes `data/content/<universe>/<slug>.md` immediately; the public page updates on the next request. No build step.
5. `status: draft` hides a page from the public site but keeps it in admin.
6. `POST /admin/logout` destroys the session.
7. Images land in `data/uploads/` and are served at `/uploads/` (png, jpg, webp, gif, svg; 12 MB cap).

One shared admin password is the whole gate. Put Unraid reverse proxy in front, use HTTPS, and set `COOKIE_SECURE=true`.

## Content layout

    data/content/<universe>/<slug>.md   articles (hub.md is the universe homepage)
    data/uploads/                       images
    seed/content/                       baked-in copy used when a volume is empty
    seed/uploads/

Each article is gray-matter Markdown. Wiki links use double-bracket slug or slug|label.

The seed script reads `../hitpoints-handoff` (Witcher Priority A, Dune wave 2, Warcraft Priority A, LotR Priority A), normalizes slugs and universe, and writes `data/content` plus `seed/content`.

On first boot, if `CONTENT_DIR` is empty (typical Unraid volume), the app copies `seed/content` into it.

## Layout

    src/server.js          HTTP entry
    src/config.js          universes, paths, env
    src/content.js         Markdown CRUD plus first-boot seed
    src/routes/public.js   / and /wiki/:universe/:slug
    src/routes/admin.js    /admin routes
    src/views/             EJS (public plus admin)
    public/                CSS, logo, admin.js
    Dockerfile

## Unraid security

- Change `ADMIN_PASSWORD` and `SESSION_SECRET` before the host is reachable from the internet.
- Do not commit `.env`.
- Keep `/admin` off the public internet if you can (VPN or an IP allowlist).
- `COOKIE_SECURE=true` once you are on HTTPS.
- Example login in `.env.example` is `ADMIN_USER=bram` / `ADMIN_PASSWORD=change-me-now`. Must be changed on Unraid.

