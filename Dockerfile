FROM oven/bun:1.3.14-slim AS base

WORKDIR /app

# Copy manifests first so `bun install` is cached until dependencies actually change.
COPY package.json bun.lock tsconfig.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/admin/package.json ./apps/admin/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/config/package.json ./packages/config/

# The docs site is not deployed here, but the lockfile describes it, so its
# manifest must be present for --frozen-lockfile. --filter then skips actually
# installing its React/Vite tree.
COPY apps/fumadocs/package.json ./apps/fumadocs/

RUN bun install --frozen-lockfile --filter server --filter admin --filter '@mine-yapping/*'

COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/admin ./apps/admin

FROM base AS server

ENV NODE_ENV=production
EXPOSE 31415

CMD ["bun", "run", "apps/server/src/index.ts"]

FROM base AS web-build
ARG VITE_API_URL=https://mine-yapper.com
ENV VITE_API_URL=$VITE_API_URL
RUN bun run --cwd apps/admin build

FROM oven/bun:1.3.14-slim AS web
WORKDIR /app
COPY --from=web-build /app/apps/admin/.output ./apps/admin/.output
ENV NODE_ENV=production PORT=4001
EXPOSE 4001
CMD ["bun", "apps/admin/.output/server/index.mjs"]
