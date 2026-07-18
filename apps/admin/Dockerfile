# Build context is the repo root (see docker-compose).
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
ENV CI=true
ARG VITE_API_BASE_URL=https://easycasaita.com/api
ARG VITE_DEV_AUTH=true
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_DEV_AUTH=$VITE_DEV_AUTH
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @easycasa/admin build

FROM nginx:1.27-alpine AS run
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
