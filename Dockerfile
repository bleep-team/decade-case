# syntax=docker/dockerfile:1
# OCI-compliant image for the Decade Exchange web app (Next.js).
# Multi-stage: install + build the whole pnpm monorepo, then run `next start`.

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV HUSKY=0
RUN corepack enable
WORKDIR /app

FROM base AS build
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be present during `next build`. Pass real values via build args in prod.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG CLERK_SECRET_KEY
ARG DATABASE_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
    DATABASE_URL=$DATABASE_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
