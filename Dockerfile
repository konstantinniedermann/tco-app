# Basis: node:26-alpine (Multi-Arch-Index-Digest; Dependabot hält ihn aktuell)
# Stufe bau: alle Abhängigkeiten, SvelteKit-Build
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS bau
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
# Kein eigener `svelte-kit sync`: der Vite-Build synchronisiert selbst (Nachweis: gleiche Dateien,
# Unterschied nur im Bauzeitstempel von version.json).
# Kurzform des Commits für die Fusszeile auf Test (ADR-012); die CI übergibt den vollen Hash.
ARG MYTCO_COMMIT=
RUN npm run build

# Stufe laufzeit: nur Produktionsabhängigkeiten, Build, Migrationen, Testdaten
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS laufzeit
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=bau /app/build ./build
COPY drizzle ./drizzle
COPY scripts/migrate.ts ./scripts/migrate.ts
# Testdaten für Test (betrieb/bin/ausliefern); laufen wie migrate.ts mit Node-Typentfernung und
# brauchen dafür den Server-Code als Quelle samt der geteilten Module unter src/lib, die er
# importiert (ohne Tests, siehe .dockerignore).
COPY src/lib ./src/lib
COPY scripts/testdaten.ts scripts/erfundene-mitglieder.ts scripts/admin-festlegen.ts scripts/test-pruefung-server.ts ./scripts/
# Einrichtung der Umgebungen (Compose, Caddy, Skripte); der Server entnimmt sie dem Image.
COPY betrieb ./betrieb
USER node
EXPOSE 3000
# Gesund nur bei status "ok" (Datenbank erreichbar); Exit 0 sonst nie.
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node","-e","fetch('http://127.0.0.1:3000/api/status').then(r=>r.json()).then(j=>process.exit(j.status==='ok'?0:1)).catch(()=>process.exit(1))"]
# Migration: docker run --rm -e DATABASE_URL=… <image> node scripts/migrate.ts
CMD ["node", "build"]
