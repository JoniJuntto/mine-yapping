# Deploying mine-yapping to UpCloud

Step-by-step deployment of the backend to an UpCloud VPS at
**`https://yapping.arvoitus.com`**, alongside the other projects already running
on that host.

This guide assumes the VPS already has:

- Docker + Docker Compose (other projects run this way)
- Caddy on the host, with one global `/etc/caddy/Caddyfile` holding every site
- Other services bound to their own ports

The Minecraft mod is **not** deployed — it's a client jar. Step 10 covers
repointing it at production and handing it out.

## Architecture on the VPS

```
                    :443 (TLS, auto-cert)
Internet ──► Caddy ──────────────────────► 127.0.0.1:31415 ──► mine-yapping-server
             (host, global Caddyfile)                          (container)
                                                                    │
                                                                    ├──► api.openai.com
                                                                    ├──► api.elevenlabs.io
                                                                    └──► UpCloud Managed PostgreSQL
```

Only Caddy is publicly reachable. The container publishes to **loopback only**
(`127.0.0.1:31415`), so port 31415 is never exposed to the internet even if the
firewall is permissive.

## Prerequisites

- [ ] SSH access to the VPS with sudo
- [ ] DNS control for `arvoitus.com`
- [ ] An UpCloud Managed PostgreSQL instance (or permission to create one)
- [ ] An OpenAI API key with billing enabled
- [ ] An ElevenLabs API key
- [ ] Port `31415` free on the VPS (verified in step 5)

---

## Step 1 — DNS

Point the subdomain at the VPS. In your DNS provider for `arvoitus.com`:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `yapping` | *your VPS public IPv4* |
| `AAAA` | `yapping` | *your VPS public IPv6* (optional) |

Verify before continuing — Caddy cannot issue a certificate until this resolves:

```bash
dig +short yapping.arvoitus.com
```

Confirm the output matches your VPS IP. DNS propagation can take a few minutes.

## Step 2 — UpCloud Managed PostgreSQL

In the UpCloud Hub → **Databases** → **PostgreSQL**:

1. Create the instance (or reuse an existing one) in the **same zone** as the VPS.
2. Under **Connection details**, note the `host`, `port`, `username`
   (usually `upadmin`), `password`, and default database name (usually `defaultdb`).
3. Create a dedicated database for this project — don't share `defaultdb` with
   your other projects:
   - UpCloud Hub → your database → **Databases** tab → add `mineyapping`.
4. Under **Network**, either attach the database to the same **SDN private
   network** as the VPS (preferred — traffic stays off the public internet), or
   add the VPS public IP to the **allowed IP addresses** list.

UpCloud Managed Databases **require TLS**, so the connection string must carry
`?sslmode=require`:

```
postgres://upadmin:PASSWORD@HOST:PORT/mineyapping?sslmode=require
```

If you attached via private network, use the private host address instead.

## Step 3 — Get the code onto the VPS

```bash
ssh your-vps
sudo mkdir -p /opt/mine-yapping
sudo chown "$USER":"$USER" /opt/mine-yapping
git clone <your-repo-url> /opt/mine-yapping
cd /opt/mine-yapping
```

## Step 4 — Environment file

Create `apps/server/.env` on the VPS. This exact path matters: Compose reads it
via `env_file`, and `packages/db/drizzle.config.ts` loads it for migrations.
It is already covered by `.gitignore`, so it will never be committed.

```bash
cat > apps/server/.env <<'EOF'
DATABASE_URL=postgres://upadmin:PASSWORD@HOST:PORT/mineyapping?sslmode=require
BETTER_AUTH_SECRET=REPLACE_ME
BETTER_AUTH_URL=https://yapping.arvoitus.com
RESEND_API_KEY=re_REPLACE_ME
AUTH_EMAIL_FROM=Mine Yapping <auth@your-verified-domain.example>
TWITCH_CLIENT_ID=REPLACE_ME
TWITCH_CLIENT_SECRET=REPLACE_ME
POLAR_ACCESS_TOKEN=REPLACE_ME
POLAR_WEBHOOK_SECRET=REPLACE_ME
POLAR_SUCCESS_URL=https://yapping.arvoitus.com
POLAR_SERVER=production
CORS_ORIGIN=https://yapping.arvoitus.com
OPENAI_API_KEY=sk-REPLACE_ME
ELEVENLABS_API_KEY=sk-REPLACE_ME
NODE_ENV=production
EOF

chmod 600 apps/server/.env
```

Generate a real auth secret (must be ≥ 32 characters — Better Auth warns loudly
about weak ones):

```bash
openssl rand -base64 48
```

Every variable above is **required**. The server validates them at boot and
exits immediately if any is missing or malformed, so a typo here shows up as a
container that won't start rather than a runtime failure later.

> `POLAR_ACCESS_TOKEN` and `POLAR_SUCCESS_URL` are required by the env schema even
> though the voice feature doesn't use payments. Any non-empty token and valid URL
> will start the server; use real Polar credentials only if you enable checkout.

## Step 5 — Check the port is free

This VPS runs multiple projects, so confirm nothing already holds 31415:

```bash
sudo lsof -i :31415 -sTCP:LISTEN
```

No output means it's free. If something *is* using it, change the port in all
three places — they must agree:

1. `apps/server/src/index.ts` → `.listen(31415, ...)`
2. `docker-compose.yml` → `ports:` and the healthcheck URL
3. `/etc/caddy/Caddyfile` → API `reverse_proxy` upstream

## Step 6 — Build and start

```bash
cd /opt/mine-yapping
docker compose build
docker compose up -d
```

Check it came up healthy:

```bash
docker compose ps
docker compose logs -f server
```

Expected log line: `Server is running on http://localhost:31415`.

Verify locally on the VPS before involving Caddy:

```bash
curl http://127.0.0.1:31415/
# → OK
```

If that returns `OK`, the container is good and any remaining problem is
Caddy or DNS.

## Step 7 — Create the database schema

Apply the Drizzle migrations to the managed database. This runs in a one-off
container so you don't need Bun or drizzle-kit installed on the host:

```bash
docker compose run --rm --workdir /app/packages/db server bunx drizzle-kit migrate
```

This applies the checked-in migrations, including Better Auth, API-key,
personality, settings, and usage tables.

> If it hangs while connecting, the database is unreachable —
> almost always the UpCloud IP allowlist or a missing `?sslmode=require`.

## Step 8 — Add the Caddy site block

Append this to the global `/etc/caddy/Caddyfile`, keeping it alongside your
other site blocks:

```caddyfile
yapping.arvoitus.com {
	encode zstd gzip

	# Voice clips are capped at 5 MB by the app; allow headroom for multipart framing.
	request_body {
		max_size 6MB
	}

	@api path /api/*
	reverse_proxy @api 127.0.0.1:31415 {
		# A single request runs transcription + LLM + TTS, so it can take a while.
		transport http {
			read_timeout 120s
		}
	}

	reverse_proxy 127.0.0.1:4001
}
```

Validate before reloading — a syntax error takes down **every** site in this
file, not just this one:

```bash
sudo caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
```

Only if it reports valid, reload with zero downtime:

```bash
sudo systemctl reload caddy
```

Caddy will now request a Let's Encrypt certificate automatically. Watch it
happen:

```bash
sudo journalctl -u caddy -f
```

## Step 9 — Verify the deployment

```bash
# health check over TLS
curl https://yapping.arvoitus.com/
# → OK

# validation still works through the proxy
curl -i -X POST https://yapping.arvoitus.com/api/converse
# → HTTP 422

# certificate is valid
curl -sI https://yapping.arvoitus.com/ | head -1
```

Full round trip with a real recording (spends OpenAI and ElevenLabs credit):

```bash
curl -D response.headers -o reply.pcm -X POST https://yapping.arvoitus.com/api/converse \
  -H 'x-api-key: my_YOUR_DASHBOARD_KEY' \
  -F audio=@speech.wav \
  -F entityId=test-uuid \
  -F entityType=minecraft:cow \
  -F entityName=Cow \
  -F playerName=joni \
  -F dimension=minecraft:overworld \
  -F health=10.0/10.0
# → raw 24 kHz, 16-bit, mono PCM in reply.pcm; metadata in X-MineYapping-* headers
```

## Step 10 — Connect the mod

The checked-in mod already targets `https://yapping.arvoitus.com/api/converse`.
Build and distribute it:

```bash
cd minecraft-mod
./gradlew build
# → build/libs/mineyapping-0.1.0.jar
```

Players create an account and a Minecraft API key in **Dashboard → Account**.
After launching once, they paste that key into
`.minecraft/config/mine-yapping.json` and restart Minecraft.

---

## Protecting provider spend

`/api/converse` verifies a hashed, revocable per-user API key, account bans,
the base monthly usage limit before calling providers. Twitch accounts receive
1.5× that limit. Also set
hard spend caps in the OpenAI and ElevenLabs dashboards as a final backstop.

## Updating a deployment

```bash
cd /opt/mine-yapping
git pull
docker compose build
docker compose up -d
```

Compose recreates the container only if the image changed. If the schema changed,
re-run step 7.

## Operations

| Task | Command |
| --- | --- |
| Follow logs | `docker compose logs -f server` |
| Last 100 lines | `docker compose logs --tail=100 server` |
| Restart | `docker compose restart server` |
| Stop | `docker compose down` |
| Container status + health | `docker compose ps` |
| Shell inside container | `docker compose exec server sh` |
| Check Caddy | `sudo systemctl status caddy` |
| Caddy logs | `sudo journalctl -u caddy -f` |

Container logs are capped at 3 × 10 MB so this project can't fill the disk that
your other projects share.

Database backups are handled by UpCloud's managed backups — verify the retention
setting in the Hub rather than rolling your own.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Container exits immediately, logs show `Invalid environment variables` | A missing/malformed var in `apps/server/.env`. The log names the exact key. |
| `curl 127.0.0.1:31415` works, `https://` doesn't | Caddy issue — check `journalctl -u caddy -f`, confirm the site block was added to the file Caddy actually loads. |
| Caddy can't get a certificate | DNS not resolving to this VPS yet, or ports 80/443 blocked by the UpCloud firewall. Let's Encrypt needs inbound 80. |
| `502 Bad Gateway` from Caddy | Container is down or unhealthy. `docker compose ps`, then check logs. |
| `drizzle-kit migrate` hangs | Database unreachable — UpCloud IP allowlist, or missing `?sslmode=require`. |
| `502` with `OpenAI 401 invalid_api_key` | Bad `OPENAI_API_KEY`. Note this proves the whole chain up to OpenAI works. |
| `502` with `ElevenLabs 401` | Bad or missing `ELEVENLABS_API_KEY`. |
| Mod says `Conversation failed: Connection refused` | Mod still points at `localhost` — see step 10. |
| Port bind fails on `docker compose up` | Another project already holds 31415 — see step 5. |
| `413` on real recordings | Audio over 5 MB; the app cap. Shorter clips, or raise it in `apps/server/src/index.ts`. |

## Rollback

```bash
cd /opt/mine-yapping
git log --oneline -5
git checkout <previous-commit>
docker compose build
docker compose up -d
```

To take the site down without touching your other projects, comment out the
`yapping.arvoitus.com` block in the Caddyfile, `sudo systemctl reload caddy`,
then `docker compose down`.
