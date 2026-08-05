FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# O frontend e estatico: quem serve os arquivos e o mesmo Caddy que termina o TLS
# e faz proxy da API. Um servidor a menos para operar.
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
