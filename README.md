# Portal – interne Anwendungsplattform

Node.js (Express) + React (Vite) + MongoDB. Alles kostenlos/Open Source, läuft per Docker auf einem Server und ist im Browser von jedem PC nutzbar.

## Start auf dem Server
```bash
cp .env.example .env      # Werte anpassen (Admin-Login, Secrets)
docker compose up -d --build
```
App: `http://SERVER:3000` – Login mit `ADMIN_EMAIL` / `ADMIN_PASSWORD` (wird beim ersten Start angelegt).
Hinter HTTPS-Proxy (z. B. Caddy/Nginx) zusätzlich `COOKIE_SECURE=true` in `.env` setzen.

## Rollen & Zugriff
Admin legt unter **Administration → Rollen** Rollen an (z. B. „Versicherung") und wählt die Anwendungen aus.
Unter **Benutzer** werden Rollen zugewiesen. Admins sehen alles. „Notizen" ist für alle Benutzer verfügbar.

## n8n → Versicherungsfälle
HTTP-Request-Node in n8n:
- `POST http://SERVER:3000/api/webhooks/insurance`
- Header `x-api-key: <WEBHOOK_API_KEY aus .env>`
- Body: ein Objekt oder Array, z. B.
```json
{ "externalId": "123", "caseNumber": "S-2024-001", "policyHolder": "Max Mustermann",
  "insurer": "Allianz", "type": "Wasserschaden", "status": "neu",
  "amount": 1200.5, "damageDate": "2024-05-01", "description": "..." }
```
Mit `externalId` wird aktualisiert statt doppelt angelegt. Deutsche Feldnamen (`versicherungsnehmer`, `schadenart` …) werden ebenfalls erkannt. Das Original wird in `raw` gespeichert.
(NocoDB-Backup: in n8n vor diesem Node einen NocoDB-Node schalten, der die Rohdaten speichert.)

## Neues Tool hinzufügen
1. `server/src/models.js` → Eintrag in `APPS` + Modell
2. `server/src/routes/<tool>.js` mit `requireApp('<key>')`, in `index.js` einhängen
3. `web/src/pages/<Tool>.jsx` + Route/Navigation in `web/src/main.jsx`

## Entwicklung
```bash
cd server && npm install && npm run dev      # braucht MongoDB (MONGO_URL)
cd web && npm install && npm run dev         # Port 5173, Proxy auf :3000
```
