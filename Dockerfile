# Bun runs the TypeScript sources directly, so there is no build step to babysit.
FROM oven/bun:1.3.14-slim

WORKDIR /app

# Copy manifests first so `bun install` is cached until dependencies actually change.
COPY package.json bun.lock tsconfig.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/

# The docs site is not deployed here, but the lockfile describes it, so its
# manifest must be present for --frozen-lockfile. --filter then skips actually
# installing its React/Vite tree.
COPY apps/fumadocs/package.json ./apps/fumadocs/

RUN bun install --frozen-lockfile --filter server --filter '@mine-yapping/*'

COPY packages ./packages
COPY apps/server ./apps/server

ENV NODE_ENV=production
EXPOSE 31415

CMD ["bun", "run", "apps/server/src/index.ts"]
