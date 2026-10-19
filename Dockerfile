FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json build.mjs ./
RUN npm ci --omit=dev --ignore-scripts
COPY site/ site/
RUN node build.mjs

FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist/ /srv/
