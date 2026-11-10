# Imagen única para la API y el worker (el comando decide cuál corre).
# Debian slim en vez de alpine: sqlite3 trae binarios precompilados para glibc.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# La configuración (credenciales, claves de Stripe) llega por variables de entorno en runtime: nunca va en la imagen.
EXPOSE 3000
CMD ["node", "dist/server.js"]
