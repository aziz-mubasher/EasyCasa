# Build context is the repo root (see docker-compose).
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
ENV CI=true
ARG NEXT_PUBLIC_API_URL=https://easycasaita.com/api
ARG NEXT_PUBLIC_SITE_URL=https://easycasaita.com
ARG NEXT_PUBLIC_OIDC_ISSUER=
ARG NEXT_PUBLIC_OIDC_CLIENT_ID=easycasa-web
ARG API_URL=http://api:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_OIDC_ISSUER=$NEXT_PUBLIC_OIDC_ISSUER
ENV NEXT_PUBLIC_OIDC_CLIENT_ID=$NEXT_PUBLIC_OIDC_CLIENT_ID
ENV API_URL=$API_URL
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @easycasa/shared build
RUN pnpm --filter @easycasa/web build

FROM node:20-alpine AS run
RUN corepack enable
WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/apps/web
ENV API_URL=http://api:4000
ENV NEXT_PUBLIC_API_URL=https://easycasaita.com/api
ENV NEXT_PUBLIC_SITE_URL=https://easycasaita.com
EXPOSE 3000
CMD ["pnpm", "start"]
