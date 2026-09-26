# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build-base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

FROM build-base AS api-build
RUN npm run build:api

FROM node:24-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DB_PATH=/data/genius.db
COPY --from=api-build /app/dist/api.mjs ./dist/api.mjs
COPY --from=api-build /app/cloudflare ./cloudflare
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 8787
CMD ["node","dist/api.mjs"]

FROM node:24-bookworm-slim AS preview
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8790
COPY server/preview-gate.mjs ./server/preview-gate.mjs
USER node
EXPOSE 8790
CMD ["node","server/preview-gate.mjs"]

FROM build-base AS web-build
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN npm run build

FROM node:24-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=web-build /app/.next ./.next
COPY --from=web-build /app/public ./public
COPY --from=web-build /app/next.config.mjs ./next.config.mjs
EXPOSE 3000
CMD ["./node_modules/.bin/next","start","--hostname","0.0.0.0","--port","3000"]
