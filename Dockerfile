# Basis: node:26-alpine (Multi-Arch-Index-Digest; Dependabot hält ihn aktuell)
# Stufe bau: alle Abhängigkeiten, SvelteKit-Build
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS bau
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm exec --no -- svelte-kit sync && npm run build

# Stufe laufzeit: nur Produktionsabhängigkeiten, Build, Migrationen
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS laufzeit
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=bau /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.ts ./scripts/migrate.ts
USER node
EXPOSE 3000
# Migration: docker run --rm -e DATABASE_URL=… <image> node scripts/migrate.ts
CMD ["node", "build"]
