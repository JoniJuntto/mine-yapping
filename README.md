# mine-yapping

Talk to Minecraft mobs with your voice. Hold **V**, speak at a mob, and it answers
in character — in chat and out loud.

A client-only Fabric mod records your microphone and POSTs it to a local Bun
backend, which runs speech-to-text → LLM → text-to-speech and returns the reply
plus synthesized audio. The mod never talks to the Minecraft server, so it works
on vanilla and modded multiplayer servers with only you having it installed.

```
[Fabric mod]  hold V → record mic → multipart POST ─┐
                                                    │
[Bun server]  /api/converse ────────────────────────┘
                 ├─ POST /v1/audio/transcriptions   (gpt-transcribe)   → transcript
                 ├─ POST /v1/responses              (gpt-5.6-luna)     → in-character reply
                 └─ POST /v1/text-to-speech/:voice  (ElevenLabs)      → WAV, base64
                                                    │
[Fabric mod]  chat lines + audio playback ◄─────────┘
```

## Features

### Voice conversation

- **Push-to-talk** on **V** (rebindable in Minecraft's controls, under the
  *MineYapping* category). Press starts recording, release sends it.
- **Mob targeting** — whatever you're looking at (crosshair entity hit) takes
  priority; otherwise the nearest living entity within **8 blocks**. Only living,
  alive entities count, and never yourself.
- **Personal and global personalities** — prompts can use `{entityName}`, `{entityType}`,
  `{playerName}`, `{dimension}`, and `{health}` placeholders. Multiple enabled
  prompts for a mob type are assigned randomly on first contact, with `*` as the
  fallback type.
- **Per-mob conversation memory** — the last **4 turns** are kept per entity UUID,
  so a given cow remembers what you just said to it. Memory is in-process and
  capped at 1000 entities (oldest evicted).
- **Spoken replies** — TTS audio is returned base64-encoded and played back
  client-side on a virtual thread, so the game loop never blocks. Each mob keeps
  its randomly assigned prompt and ElevenLabs voice in PostgreSQL across restarts.
- **Chat transcript** — you see `You: <transcript>` and `<Mob>: <reply>` as
  colored system messages, visible only to you.

### Server

- **Elysia + Bun** HTTP API with typed request validation (`@sinclair/typebox`).
- `POST /api/converse` — multipart endpoint; rejects audio over **5 MB** (413),
  malformed bodies (422), and surfaces upstream provider failures as **502**
  with the provider's message.
- `GET /` — health check, returns `OK`.
- **Structured LLM output** — the reply is requested via a strict `json_schema`
  so parsing can't drift.
- **CORS** restricted to `CORS_ORIGIN`.
- **Owned personality API** — users manage only their prompts; admins manage global
  defaults. Every ownership and role check is enforced by the server.
- **Usage and quotas** — successful and failed requests are recorded without audio
  or transcripts, with Polar subscriptions checked when the free quota is reached.
- **Env validation** at boot via `@t3-oss/env-core` + Zod — the process refuses to
  start with missing or malformed config rather than failing at request time.

### Platform

- **Auth** — Better-Auth with email/password, Drizzle adapter on PostgreSQL,
  admin roles, hashed API keys, and Polar checkout/customer portal.
- **Database** — Drizzle ORM, PostgreSQL, schema-first with push/generate/migrate.
- **Docs site** — Fumadocs (TanStack Start + Vite) in `apps/fumadocs`.
- **Web app** — landing, signup/login, user dashboard, billing/API-key account page,
  and role-protected admin pages on `http://localhost:4001`.
- **Tooling** — Turborepo, Biome, Bun workspaces, TypeScript.

`/api/converse` requires a hashed, revocable Better Auth API key in `x-api-key`.

## Project structure

```
mine-yapping/
├── apps/
│   ├── server/       # Elysia API — conversation endpoint + auth handler
│   ├── admin/        # TanStack Start product web app (kept named admin for now)
│   └── fumadocs/     # Documentation site
├── packages/
│   ├── auth/         # Better-Auth + Polar configuration
│   ├── db/           # Drizzle schema & client
│   ├── env/          # Zod-validated environment
│   └── config/       # Shared tsconfig
├── minecraft-mod/    # Fabric client mod (Java/Gradle, NOT in the Bun workspace)
├── Dockerfile        # Server and web image targets
└── docker-compose.yml
```

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

Create `apps/server/.env`. **All** of these are required — the server exits at
startup if any is missing:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | min. 32 characters |
| `BETTER_AUTH_URL` | valid URL, e.g. `http://localhost:31415` |
| `POLAR_ACCESS_TOKEN` | any non-empty string works for local play |
| `POLAR_SUCCESS_URL` | valid URL |
| `POLAR_SERVER` | optional: `sandbox` (default) or `production` |
| `CORS_ORIGIN` | valid URL |
| `OPENAI_API_KEY` | required for `/api/converse` |
| `ELEVENLABS_API_KEY` | required for reply speech |
| `DISABLE_SIGN_UP` | optional; set `true` only for an invite/admin-created user model |
| `NODE_ENV` | optional, defaults to `development` |

To skip validation temporarily (e.g. running only the tests):
`SKIP_ENV_VALIDATION=1`.

### 3. Database

```bash
bun run db:migrate
```

Create the first account while `DISABLE_SIGN_UP=false`:

```bash
curl -X POST http://localhost:31415/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"name":"Admin","email":"admin@example.com","password":"change-me-now"}'
```

Promote it once with PostgreSQL, then sign in again to refresh the session:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'admin@example.com';
```

Set `CORS_ORIGIN=http://localhost:4001` for the local admin app.
Set `VITE_API_URL=http://localhost:31415` in `apps/admin/.env` only when overriding
the development default.

### 4. Run

```bash
bun run dev:server     # server only, http://localhost:31415
bun run dev:admin      # admin only, http://localhost:4001
bun run dev            # everything (server + docs)
```

## Testing

### Unit tests

```bash
bun test
```

Covers the OpenAI response parser, typed-chat transcription bypass, sticky
personas, random prompt selection, catch-all fallback, and placeholders.

> `bun test` from the repo root also picks up a stale compiled copy under
> `apps/server/dist/`, so you may see each test twice ("4 tests across 2 files").
> Scope it with `bun test apps/server/src` to run the sources only.

### Type checking and linting

```bash
bun run check-types    # tsc across all workspaces
bun run check          # Biome format + lint, writes fixes
```

### Testing the server without Minecraft

Start the server, then exercise the endpoints with `curl`:

```bash
# health check
curl http://localhost:31415/
# → OK

# validation: missing fields are rejected before any API call
curl -i -X POST http://localhost:31415/api/converse
# → HTTP 422

# full round trip with a real recording
curl -X POST http://localhost:31415/api/converse \
  -H 'x-api-key: my_YOUR_DASHBOARD_KEY' \
  -F audio=@speech.wav \
  -F entityId=test-uuid \
  -F entityType=minecraft:cow \
  -F entityName=Cow \
  -F playerName=joni \
  -F dimension=minecraft:overworld \
  -F health=10.0/10.0
# → {"transcript":"...","reply":"...","audio":"<base64 wav>"}
```

Record a test WAV on macOS with any recorder, or reuse one the mod produced.
The endpoint expects 16 kHz mono 16-bit PCM WAV, which is what the mod sends,
but the transcription API tolerates other common formats.

To confirm the pipeline is wired up without spending tokens, run with a bogus
`OPENAI_API_KEY` — a well-formed request returns **502** carrying the upstream
`invalid_api_key` message, which proves everything up to the OpenAI call works.

### Building and running the mod

No JDK install needed — the Gradle wrapper downloads JDK 25 (Adoptium) itself on
first run, on both macOS and Windows.

```bash
cd minecraft-mod
./gradlew build        # → build/libs/mineyapping-0.1.0.jar
./gradlew runClient    # launches Minecraft 26.1.2 with the mod loaded
```

In IntelliJ: **Open** the `minecraft-mod` folder as its own Gradle project, then
use the generated **Minecraft Client** run configuration.

Create a Minecraft key under **Dashboard → Account**, join a world, and run
`/login <token>` in chat. For local testing, set `serverUrl` in
`.minecraft/config/mine-yapping.json` to
`http://localhost:31415/api/converse`.

To play with it normally, drop the jar into `.minecraft/mods` alongside Fabric
Loader ≥ 0.19.3 and Fabric API.

### End-to-end test in game

1. Start the backend (`bun run dev:server`) and confirm `curl http://localhost:31415/`
   returns `OK`.
2. `./gradlew runClient`, then create or join any world.
3. Walk up to a mob, **hold V**, speak, and release.
4. Expected chat sequence:
   - `Listening to <Mob>...` (aqua) — recording started
   - `Thinking...` (gray) — audio uploaded
   - `You: <what you said>` (dark gray)
   - `<Mob>: <reply>` (gold) — and the reply is spoken aloud

**Failure messages and what they mean:**

| Message | Cause |
| --- | --- |
| `Look at a mob or move within 8 blocks.` | No living entity in range |
| `Microphone unavailable: ...` | No capture device the JVM can open |
| `Hold V a little longer so I can hear you.` | Under ~1 KB captured (roughly 30 ms) |
| `Conversation failed: Connection refused` | Backend not running on port 31415 |
| `Conversation failed (502): OpenAI 401 ...` | Bad or missing `OPENAI_API_KEY` |
| `Conversation failed (502): ElevenLabs 401 ...` | Bad or missing `ELEVENLABS_API_KEY` |
| `Speech playback failed: ...` | JVM couldn't play the returned WAV |

Test conversation memory by asking a follow-up question that only makes sense
with context ("what did I just say?") to the *same* mob — it should track across
up to 4 turns, and a different mob should have no idea.

## Deployment

See **[DEPLOY.md](DEPLOY.md)** for deploying the backend to an UpCloud VPS at
`yapping.arvoitus.com` — Docker Compose behind the host's global Caddy, with
UpCloud Managed PostgreSQL.

To run the server and web containers locally:

```bash
docker compose up -d --build   # API :31415, web app :4001 on loopback
docker compose logs -f server
```

## Known limitations

- **Android is not supported yet.** Mic capture uses `javax.sound.sampled`, which
  has no working mixer on the Android OpenJDK builds that PojavLauncher-family
  launchers ship. Moving capture to LWJGL's OpenAL (`ALC11.alcCaptureOpenDevice`)
  is the intended fix — Minecraft already bundles it on every platform, and it
  also enables spatial playback.
- **Port 31415 is fixed on the server.** If something else holds it, the server
  exits with `EADDRINUSE` — check with `lsof -i :31415`. The mod endpoint is
  configurable in `mine-yapping.json`, but there is no in-game editor yet.
- **Conversation history is in-process** — it's lost on restart and isn't shared
  across server instances.
- Audio playback is not positional; the reply plays at full volume regardless of
  distance to the mob.

## Notes on Minecraft 26.x

Minecraft 26.x ships **deobfuscated**, so there is no `mappings` line in
`build.gradle` and dependencies use plain `implementation` rather than
`modImplementation`. Yarn and Mojang mapping files do not exist for these
versions — do not try to add them.

## Available scripts

| Script | Description |
| --- | --- |
| `bun run dev` | Start all apps in development mode |
| `bun run dev:server` | Start only the server |
| `bun run dev:admin` | Start only the admin app |
| `bun run build` | Build all applications |
| `bun run check-types` | Type-check all workspaces |
| `bun run check` | Biome format + lint (writes fixes) |
| `bun test` | Run unit tests |
| `bun run db:push` | Push schema changes to the database |
| `bun run db:generate` | Generate migrations |
| `bun run db:migrate` | Run migrations |
| `bun run db:studio` | Open Drizzle Studio |
