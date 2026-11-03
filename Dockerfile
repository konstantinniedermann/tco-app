# Basis: node:26-alpine (Multi-Arch-Index-Digest; Dependabot hält ihn aktuell)
# Stufe bau: alle Abhängigkeiten, SvelteKit-Build
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS bau
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
# Kein eigener `svelte-kit sync`: der Vite-Build synchronisiert selbst (Nachweis: gleiche Dateien,
# Unterschied nur im Bauzeitstempel von version.json).
RUN npm run build

# Stufe laufzeit: nur Produktionsabhängigkeiten, Build, Migrationen, Testdaten
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS laufzeit
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=bau /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.ts ./scripts/migrate.ts
# Testdaten für Test (betrieb/bin/ausliefern); laufen wie migrate.ts mit Node-Typentfernung und
# brauchen dafür den Server-Code als Quelle (ohne Tests, siehe .dockerignore).
COPY src/lib/server ./src/lib/server
COPY scripts/testdaten.ts scripts/erfundene-mitglieder.ts ./scripts/
# Einrichtung der Umgebungen (Compose, Caddy, Skripte); der Server entnimmt sie dem Image.
COPY betrieb ./betrieb
USER node
EXPOSE 3000
# Gesund nur bei status "ok" (Datenbank erreichbar); Exit 0 sonst nie.
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node","-e","fetch('http://127.0.0.1:3000/api/status').then(r=>r.json()).then(j=>process.exit(j.status==='ok'?0:1)).catch(()=>process.exit(1))"]
# Migration: docker run --rm -e DATABASE_URL=… <image> node scripts/migrate.ts
CMD ["node", "build"]
