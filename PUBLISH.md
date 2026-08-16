# Publishing Mine Yapping

This is the release runbook for turning the repository into a public, free
service at `https://mine-yapper.com`, funded by optional AI credit packs.

`DEPLOY.md` is the command-by-command VPS/Caddy/PostgreSQL guide. This document
covers the larger launch: product decisions, legal and provider setup, payment,
the downloadable mod, user onboarding, verification, operations, and rollback.

## What is being published

| Part | Production location | How it ships |
| --- | --- | --- |
| Product website and dashboard | `https://mine-yapper.com` | `web` Docker container behind Caddy |
| Auth, purchases, admin, and conversation API | `https://mine-yapper.com/api/*` | `server` Docker container behind Caddy |
| PostgreSQL | UpCloud Managed PostgreSQL | Private/TLS database connection |
| Fabric client mod | GitHub Releases | Free downloadable jar |
| AI providers | OpenAI + ElevenLabs | Server-side API calls only |
| AI credits | Polar (merchant of record) | Hosted one-time checkout |

The mod is client-only. It does not go on a Minecraft server. A player installs
the jar, creates a website account and API key, then uses that key in the mod.

## Launch blockers

### Product and legal

- [ ] Choose the legal seller name, country, support email, public contact
  address, credit pack prices, refund policy, and monthly allowance.
  - Seller name: Pöhinä Group Oy, business ID 3419352-5
  - Support email: joni@pohina.group
  - Credit packs (VAT included): 1000 / €20.90, 1750 / €35.90, 2500 / €49.90.
    Priced to break even even if every request hits the cost caps — see
    `apps/server/src/pricing.test.ts`.
  - Refund policy: 14-day withdrawal, unused credits refunded pro rata
  - Base monthly allowance: 100 requests; Twitch accounts receive 150
- [x] Review the model against the current
  [Minecraft EULA](https://www.minecraft.net/eula) and
  [Minecraft Usage Guidelines](https://www.minecraft.net/usage-guidelines).
  The mod is free and fully featured, credits buy only metered AI capacity (never
  a feature or a gameplay advantage), BYOK and self-hosting stay free and
  unlimited, and authorization never checks Polar customer state. Re-review
  before changing any of those facts.
- [x] Put this prominently on the website and mod metadata, and also include it
  on the download page, release notes, and
  store description: **“NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR
  ASSOCIATED WITH MOJANG OR MICROSOFT.”**
- [x] Do not use the Minecraft logo, official artwork, game files, or wording
  that implies endorsement. Only distribute this project's jar.
- [x] Publish Terms of Service, Privacy Policy, Refund/Cancellation Policy, and a
  support contact before checkout is enabled. The privacy notice must explain
  that microphone audio and text are sent to the service and its OpenAI and
  ElevenLabs subprocessors, what usage/account data is retained, retention
  periods, deletion/contact rights, and international transfers where relevant.
  Live at `/terms`, `/privacy`, `/refunds`; support `joni@pohina.group`.
- [ ] Confirm whether an age gate or parental consent is required for the chosen
  markets. Minecraft has many minors; do not silently treat this as adult-only.
- [x] Confirm the code license. Root `LICENSE` is MIT, matching `fabric.mod.json`.

This is an engineering checklist, not legal or tax advice.

### Product behavior that must be decided or fixed

- [x] Add a visible **Download mod** link to the landing page and signed-in
  dashboard. Point it at the stable release asset described below.
- [x] State that the mod is free, all users have the same monthly allowance, and
  credits buy requests only — no features, no extra allowance.
- [ ] Decide account recovery. The current app has no password reset, email
  verification, or email delivery. For a small closed beta, document manual
  support recovery; before public launch, add a verified recovery path.
- [x] Decide account deletion. **Support-mediated only for launch** (no
  self-service UI). Privacy already states this. Process:
  1. User emails `joni@pohina.group` from the account email (or a parent/guardian
     for a minor), requesting deletion.
  2. Confirm identity from the account email / Twitch link / recent activity.
  3. Delete the app user (Better Auth admin `removeUser`, or delete the `user`
     row). Cascades remove sessions, credentials, API keys, BYOK keys, usage
     events, and personas. `purchase` rows cascade with the user, so **copy them
     out first**: Finnish bookkeeping law requires six years of retention.
  4. In Polar, delete/anonymize the customer with
     `polar.customers.deleteExternal({ externalId: <userId> })` (or the dashboard
     equivalent). App user delete does **not** remove the Polar customer today.
  5. Reply confirming deletion and what was retained (purchase accounting,
     Polar/Twitch/provider-side records, backups until expiry).
  Do not promise in-product self-service deletion until a UI exists and Polar
  cleanup is hooked (e.g. Better Auth `user.deleteUser.afterDelete` →
  `customers.deleteExternal`).
- [x] Add links to support, Terms, Privacy, and Refund/Cancellation Policy in the
  site footer and checkout-adjacent UI.
- [x] Set `POLAR_SUCCESS_URL` to
  `https://mine-yapper.com` (landing page after checkout). Documented in
  `DEPLOY.md` and the production env block below; there is no `/success` route.
- [x] Public sign-up is open. `DISABLE_SIGN_UP` defaults to `false` and the
  production env template sets `DISABLE_SIGN_UP=false`.
- [x] Player transcript in Minecraft no longer uses a `[DEBUG]` prefix (still
  shown in dark gray chat).

### Safety, cost, and reliability

- [x] Set provider project-level budgets/alerts and the lowest practical hard
  spend limits in OpenAI and ElevenLabs.
- [ ] Add an edge/IP rate limit in Caddy or another trusted layer for the free
  tier (platform OpenAI/ElevenLabs keys). Better Auth API key rate limiting is
  deliberately disabled in `packages/auth/src/index.ts`. The monthly quota
  limits successful free requests, not every abusive attempt. This does not
  apply to BYOK — those requests use the user's own provider keys and do not
  consume the free allowance.
- [x] Verify UpCloud automated backup retention and perform one restore drill.
- [x] Keep all production secrets out of Git and client-side code. Rotate any key
  that has ever appeared in a commit, log, screenshot, shell history, or chat.
  Verified: `apps/server/.env` is gitignored and untracked; docs use placeholders
  only; admin/web expose only `VITE_API_URL`; mod jar has no provider secrets
  (user key stays in local config). No secret-like values found in git history or
  local shell history. Still rotate any key you know was pasted into a screenshot
  or external chat.

## 1. Create the production accounts

Use organization/project accounts rather than personal defaults where the
provider supports them. Store recovery codes and ownership information in the
team password manager.

- [x] Domain/DNS access for `arvoitus.com`.
- [x] UpCloud VPS access and a Managed PostgreSQL database in the same zone.
- [ x] OpenAI API project with billing, scoped production API key, budget, and
  alerts.
- [x] ElevenLabs production API key with usage alerts/limits.
- [x] Polar production organization with business/support information.
- [x] GitHub repository release access. The repository is public, so its release
  assets can be downloaded without a GitHub account.
- [x] A support mailbox monitored by a real person.


Record the owner, renewal date, billing account, and recovery method for every
account. Never put secret values in this file.

## 2. Configure and test Polar credit packs

Polar Sandbox and Production are isolated: tokens, products, customers, and
orders from one environment do not exist in the other.

### Sandbox first

1. Create a Polar Sandbox organization.
2. Create three **one-time** products, one per pack in
   `packages/auth/src/credits.ts`, and copy each UUID:
   - **Mine Yapping AI credits — 1000 requests**, €20.90
   - **Mine Yapping AI credits — 1750 requests**, €35.90
   - **Mine Yapping AI credits — 2500 requests**, €49.90

   Name them for the AI capacity, never for a Minecraft feature: what is sold is
   metered compute, which is what keeps this clear of both the Minecraft EULA and
   Finnish money-collection law.
3. In Polar organization settings, create a sandbox Organization Access Token.
   Keep it server-side. Give it only the scopes needed for checkout sessions.
4. Configure the deployed staging server with:

   ```dotenv
   POLAR_ACCESS_TOKEN=<sandbox organization access token>
   POLAR_WEBHOOK_SECRET=<sandbox webhook signing secret>
   POLAR_SERVER=sandbox
	 POLAR_SUCCESS_URL=https://staging.example.com
   POLAR_CREDIT_PRODUCTS=credits-1000:<uuid>,credits-1750:<uuid>,credits-2500:<uuid>
   ```

5. Add a Polar webhook for `order.paid` pointing to
   `https://staging.example.com/api/auth/polar/webhooks`.
6. Restart the API so `POLAR_CREDIT_PRODUCTS` is picked up. Packs are hidden
   until it is set, and checkout requires a signed-in user.
7. Buy each pack in sandbox and confirm the balance on **Dashboard → Account**
   rises by exactly the pack size, and that the return lands on the landing page.
8. Redeliver an `order.paid` webhook from the Polar dashboard and confirm the
   balance does **not** move a second time.
9. Verify credits change nothing but the balance: same features, same monthly
   free allowance, no priority.

### Move to live payments

1. Complete Polar organization details and production onboarding. Polar acts as
   Merchant of Record, but the seller must still complete identity/KYC and payout
   setup. Polar notes that the first payout review can take up to 14 days, so do
   not schedule launch before approval capacity is known.
2. Create the real one-time **Support Mine Yapping** product in Production.
   Confirm its currency, amount, tax display, refund wording, and visibility.
3. Create a new **production** Organization Access Token in Polar. Never reuse
   the sandbox token.
4. Put the production token and `POLAR_SERVER=production` in
   `apps/server/.env`. Use:

   ```dotenv
	 POLAR_SUCCESS_URL=https://mine-yapper.com
   ```

5. Add the production `order.paid` webhook pointing to
   `https://mine-yapper.com/api/auth/polar/webhooks`.
6. Put the **production** product UUIDs in `POLAR_CREDIT_PRODUCTS` and restart
   the API. Sandbox UUIDs will not work in Production.
7. Buy one pack live. Verify checkout, VAT on the receipt, the credited balance,
   and the Polar order/payout record. Refund it to exercise the refund path.

Useful official references:

- [Polar + Better Auth integration](https://polar.sh/docs/integrate/sdk/adapters/better-auth)
- [Polar Organization Access Tokens](https://polar.sh/docs/integrate/oat)
- [Polar account reviews](https://polar.sh/docs/merchant-of-record/account-reviews)

## 3. Prepare production infrastructure

Follow `DEPLOY.md` for DNS, UpCloud PostgreSQL, Docker Compose, Caddy, migrations,
health checks, operations, and rollback, with these corrections/additions.

### Production environment

Create `apps/server/.env` on the VPS with mode `0600`:

```dotenv
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/mineyapping?sslmode=require
BETTER_AUTH_SECRET=<at least 32 random characters>
BETTER_AUTH_URL=https://mine-yapper.com
RESEND_API_KEY=<production Resend API key>
AUTH_EMAIL_FROM=Mine Yapping <auth@your-verified-domain.example>
CORS_ORIGIN=https://mine-yapper.com
OPENAI_API_KEY=<production project key>
ELEVENLABS_API_KEY=<production key>
POLAR_ACCESS_TOKEN=<production organization access token>
POLAR_WEBHOOK_SECRET=<production webhook signing secret>
POLAR_SERVER=production
POLAR_SUCCESS_URL=https://mine-yapper.com
DISABLE_SIGN_UP=false
NODE_ENV=production
```

Generate the auth secret once with `openssl rand -base64 48`. Back it up securely;
changing it invalidates existing sessions. `VITE_API_URL` is compiled into the
web image and is already set to `https://mine-yapper.com` in
`docker-compose.yml`.

### Deploy in the safe order

1. Point DNS to the VPS and verify ports 80/443 are reachable.
2. Provision the database, TLS connection, allowlist/private network, backups,
   and capacity alerts.
3. Clone the repository into `/opt/mine-yapping`.
4. Install the environment file above.
5. Build images, but do not advertise the site yet:

   ```bash
   docker compose build
   docker compose up -d
   ```

6. Apply checked-in migrations before serving new code:

   ```bash
   docker compose run --rm --workdir /app/packages/db server bunx drizzle-kit migrate
   ```

7. Configure and validate Caddy exactly as described in `DEPLOY.md`, then reload
   it and verify TLS.
8. Create the first account, promote it to `admin` directly in PostgreSQL, sign
   out, and sign back in so the new role is in the session.
9. In **Admin → Settings**, set the base monthly request count
   and the live Polar credit product UUIDs.
10. Create at least one enabled global `*` fallback personality. The migration
    supplies one; verify it was not deleted.
11. Keep the previous known-good commit and database backup identifier recorded
    before every later deployment.

Do not expose ports 31415 or 4001 publicly. They must remain bound to
`127.0.0.1`; Caddy is the public entry point.

## 4. Build and publish the Fabric mod

The current release targets:

- Minecraft Java Edition `26.1.2`
- Fabric Loader `>=0.19.3`
- Fabric API `0.155.2+26.1.2` at build time
- Java `>=25`
- Mod version `0.1.0`
- Production API `https://mine-yapper.com/api/converse`

### Version and release build

1. Confirm the backend is backward-compatible with the mod being released.
2. Update `mod_version` in `minecraft-mod/gradle.properties` for every public
   release. Use the same version in the Git tag and release title.
3. If Minecraft, Fabric Loader, or Fabric API changes, update all three version
   properties, `fabric.mod.json` constraints if needed, README/PUBLISH support
   text, and test a clean client.
4. From a clean checkout of the exact release commit, run:

   ```bash
   bun install --frozen-lockfile
   bun test apps/server/src
   bun run check-types
   bun run build
   cd minecraft-mod
   ./gradlew clean build
   shasum -a 256 build/libs/mineyapping-<version>.jar
   ```

   On Windows use `gradlew.bat clean build` and
   `certutil -hashfile build\\libs\\mineyapping-<version>.jar SHA256`.

5. Test the resulting jar, not a development run configuration, in a clean
   Minecraft instance with only matching Fabric Loader, Fabric API, and the jar.
6. Test sign-up/login, `/login`, text conversation, microphone conversation,
   TTS playback, quota rejection, invalid/revoked key, credit checkout, restart,
   and multiplayer on a server that has no Mine Yapping server mod.
7. Scan the jar and inspect it to ensure it contains no API key, `.env`, database
   URL, source map with secrets, or third-party game files.

### GitHub Release and permanent download link

GitHub Releases is already available because the repository is public. Use one
release asset with a stable filename so the site link never changes.

Pushing an annotated tag such as `v0.1.0` runs
`.github/workflows/release-mod.yml`, which builds the Fabric jar and publishes a
GitHub Release with:

- `mineyapping.jar` (stable name used by the website download button)
- `mineyapping-<version>.jar` (versioned copy)
- `checksums.sha256`

Manual release checklist:

1. Update `mod_version` in `minecraft-mod/gradle.properties` so it matches the
   tag you will push (`0.1.0` → `v0.1.0`). Do not commit a copied
   `mineyapping.jar`; `build/` is already ignored.
2. Push the release commit and an annotated tag:

   ```bash
   git tag -a v0.1.0 -m "Mine Yapping v0.1.0"
   git push origin v0.1.0
   ```

3. Confirm the Actions run succeeds, then edit the generated release notes with
   supported Minecraft/Fabric/Java versions, install steps, changes, known
   limitations, privacy/terms links, and support contact.
4. Mark untested builds as pre-releases. For a production version, publish only
   after the end-to-end test passes.
5. Verify these URLs in a signed-out/private browser:

   ```text
   https://github.com/JoniJuntto/mine-yapping/releases/latest
   https://github.com/JoniJuntto/mine-yapping/releases/latest/download/mineyapping.jar
   ```

6. Use the second URL for every **Download mod** button. Never link to a local
   Gradle build path or GitHub's automatically generated source archive.

You can also run **Release Fabric mod** via workflow dispatch to build and
upload jar artifacts without creating a release.

GitHub documents binary attachments in
[Managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

Optional later: publish the same signed/checksummed jar on Modrinth or CurseForge
for discovery and launcher installation. Do not add a second channel until the
GitHub release/update process is reliable.

## 5. End-user instructions

Publish this section on the website alongside the download button.

### Requirements

- A legitimate Minecraft: Java Edition installation matching the version listed
  on the download page. Bedrock Edition is not supported.
- A desktop Windows, macOS, or Linux computer. Android/PojavLauncher is not
  supported.
- Fabric Loader matching the listed Minecraft version.
- Fabric API matching the listed Minecraft version.
- A working microphone and audio output.

### Install

1. Install Fabric Loader for the supported Minecraft version using the official
   [Fabric installer](https://fabricmc.net/use/installer/).
2. Download the matching Fabric API jar from an official Fabric distribution
   link.
3. Launch the Fabric profile once, then close Minecraft.
4. Download `mineyapping.jar` from the Mine Yapping website. Do not download the
   repository's “Source code” zip/tarball.
5. Put both the Fabric API jar and `mineyapping.jar` in the `mods` folder:

   | OS | Default folder |
   | --- | --- |
   | Windows | `%APPDATA%\.minecraft\mods` |
   | macOS | `~/Library/Application Support/minecraft/mods` |
   | Linux | `~/.minecraft/mods` |

   Create `mods` if it does not exist. Remove older Mine Yapping jars so only one
   version is installed.
6. Start Minecraft with the Fabric profile. Confirm **MineYapping** appears in
   the loaded mods list/log and grant microphone access if the OS asks.

### Connect the account

1. Open `https://mine-yapper.com`, create an account, and sign in.
2. Open **Dashboard → Account** and select **Create key** under **Minecraft API
   keys**.
3. Copy the key immediately. It is shown only once. Treat it like a password.
4. Join any single-player world or multiplayer server and run:

   ```text
   /login my_YOUR_KEY
   ```

   This is a client command and should not be sent to the Minecraft server. The
   key is saved locally in `.minecraft/config/mine-yapping.json`.
5. To disconnect a computer, revoke the key under **Dashboard → Account**. Create
   a separate key for each computer so one device can be revoked safely.

### Use

1. Look directly at a living mob within 8 blocks, or stand near one.
2. Hold **V**, speak, then release. The key is rebindable under Minecraft
   **Controls → MineYapping**.
3. Wait for `Thinking...`; the answer appears in local chat and plays through the
   computer's audio output.
4. Typed chat while targeting/near a mob is also treated as a mob conversation
   and is not sent as normal server chat. Move away from mobs to send ordinary
   chat.
5. Create custom mob personalities from the dashboard. `*` is the fallback type.

Never paste an API key into server chat, Discord, screenshots, or support tickets.
Support should ask only for the visible key prefix and account email, never the
full key.

### User troubleshooting

| Problem | Fix |
| --- | --- |
| Fabric reports incompatible mod | Use the exact Minecraft, Loader, Fabric API, and Java versions on the download page. |
| Mod does not load | Confirm both jars are directly in `mods`, not zipped or nested, and remove old duplicate versions. |
| `Run /login <token>` | Create a dashboard key and run the client command in a world. |
| `Invalid or revoked Minecraft API key` | Create a new key, run `/login` again, and revoke the old one. |
| `Look at a mob or move within 8 blocks` | Target a living mob within range. |
| `Microphone unavailable` | Grant OS microphone permission, select a working default input, then restart Minecraft. |
| `Monthly free usage limit reached and no AI credits left` / HTTP 402 | Wait for the UTC calendar-month reset, or buy credits. |
| HTTP 502 mentioning OpenAI/ElevenLabs | Service/provider incident; retry later and check the status page. |
| Speech playback failed | Select a working default output device and restart Minecraft. |
| Android/PojavLauncher | Unsupported in the current release. |

## 6. Pre-launch verification

Run all checks against production after deployment and before announcing it.

### Automated

```bash
bun install --frozen-lockfile
bun test apps/server/src
bun run check-types
bun run build
cd minecraft-mod && ./gradlew clean build
```

Do not run `bun run check` as a read-only release check: the current script uses
`biome check --write` and may modify files. Use `bunx biome check .` when a
non-writing check is wanted.

### Website, auth, and admin

- [ ] `https://mine-yapper.com` loads over valid TLS on desktop and mobile.
- [ ] Sign-up, sign-in, sign-out, session persistence, and wrong-password errors
  work in a private browser.
- [ ] A normal user cannot open `/admin` or call `/api/admin/*`.
- [ ] Admin overview, users, global personalities, bans, API-key revocation, free
  allowance, and Polar credit pack checkout work.
- [ ] Users can create/edit/delete only their own personalities and keys.
- [ ] Download, legal, support, purchase, and refund links are visible and
  work without signing in.
- [ ] Security headers, CORS, cookie `Secure`/`HttpOnly`/`SameSite`, and request
  body limits are correct through Caddy.

### Credit packs

- [ ] Checkout uses the one-time production products and the expected VAT-inclusive prices.
- [ ] Successful checkout returns to the landing page.
- [ ] Successful, failed, canceled, and refunded purchases never change features
  or the monthly request limit.
- [ ] Standard users are rejected at the base limit and Twitch users at 1.5×.
- [ ] Refund, receipt, support, and reconciliation procedures are written down.

### Mod and API

- [ ] The public `latest/download/mineyapping.jar` URL works signed out and its
  SHA-256 matches the release notes.
- [ ] A fresh installation works on every advertised OS/version combination.
- [ ] One real voice conversation succeeds end to end over production TLS.
- [ ] Text conversation, TTS, memory, personal/global personality priority, API
  key revocation, quota response, timeout, and provider failure were exercised.
- [ ] No provider secret is present in the jar or browser bundle.
- [ ] Caddy/API logs do not contain audio, transcripts, passwords, or full API
  keys.

### Operations

- [ ] Both containers are healthy and restart after a controlled reboot.
- [ ] Database backup is current and a restore has been proven.
- [ ] Alerts reach the on-call person.
- [ ] OpenAI, ElevenLabs, Polar, VPS, and database dashboards are accessible to a
  second recovery owner.
- [ ] Rollback to the previous container commit has been rehearsed.
- [ ] A short public status/incident message template exists.

## 7. Launch

1. Freeze code except for launch blockers.
2. Tag and publish the tested mod release.
3. Deploy the matching backend/web commit and run migrations.
4. Re-run the production smoke tests above.
5. Enable the production Polar product ID only after checkout/legal/support pages
   are live.
6. Announce to a small beta group first. Watch errors, latency, purchases,
   refunds, quotas, and provider spend for at least one full usage cycle.
7. Open the wider launch only if no data-loss, billing, or spend
   issue remains.

## 8. Routine release procedure

For every application or mod update:

1. Review dependency/security updates and Minecraft/Fabric compatibility.
2. Run the automated and end-to-end checks.
3. Back up the database and record the deployed commit.
4. Apply migrations, deploy API/web, and smoke test.
5. Publish the mod only after its required backend is live.
6. Keep older supported mod versions downloadable. State minimum compatible
   backend/mod versions in release notes.
7. Monitor logs and provider spend; rollback using `DEPLOY.md` if needed.
8. Update privacy/terms/subprocessor disclosures whenever data flow or providers
   change.

Monthly:

- Reconcile Polar credit orders/refunds/payouts against `purchase` rows.
- Review OpenAI/ElevenLabs cost per successful request and user outliers.
- Review failed requests, latency, disk/database growth, backup results, expired
  secrets/certificates, admin accounts, and revoked staff access.
- Test one new sign-up, credit checkout, API key, and real conversation.

For every Minecraft release, verify compatibility before changing the advertised
version. Never claim broad compatibility from the current `>=26.1` manifest
alone; test the exact release.

## 9. Incident and rollback basics

- **Credit checkout fails:** clear `POLAR_CREDIT_PRODUCTS` and restart
  to hide signed-in checkout, investigate, and do not delete payment records.
- **Provider spend spike:** disable public traffic or set monthly requests
  to `0`, revoke compromised keys, apply provider caps, then investigate. An
  edge/IP block may still be needed for abusive request floods that never reach
  a successful quota count.
- **Compromised app secret:** rotate the affected provider/API secret and restart
  the server. Rotating `BETTER_AUTH_SECRET` signs users out.
- **Bad application deploy:** use the previous commit rollback steps in
  `DEPLOY.md`. Do not reverse a database migration unless a tested down migration
  exists; prefer rolling application code forward to schema compatibility.
- **Bad mod release:** mark the GitHub release as affected, publish a fixed version
  with a new tag, and update the download page. Do not silently replace a released
  binary under the same version/checksum.
- **Data/privacy incident:** preserve evidence, restrict access, contact the legal/
  privacy owner, and follow applicable notification deadlines.

## Current verified repository state

Verified locally on 2026-08-14:

- `bun test apps/server/src`: 10 tests passed.
- `bun run check-types`: passed.
- `bun run build`: passed for server, web app, and docs (docs emitted a large
  chunk warning only).
- `minecraft-mod/gradlew build`: passed.
- Built jar: `minecraft-mod/build/libs/mineyapping-0.1.0.jar`.
- Local jar SHA-256:
  `087ec91f420337fa46a2bb6f44a7445900cf1707341029060f47111771b8658a`.

That checksum describes only the local build inspected on that date. Rebuild from
the tagged release commit and publish the new checksum; do not copy this value
into release notes without comparing the actual uploaded asset.
