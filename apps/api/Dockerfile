# Build context is the repo root (see docker-compose).
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
ENV CI=true
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @easycasa/shared build
RUN pnpm --filter @easycasa/api build

FROM node:20-alpine AS run
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
