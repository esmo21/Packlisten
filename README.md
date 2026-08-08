# Packfertig

Eine super responsive Web-App für wiederverwendbare Packlisten-Vorlagen und konkrete Reisen. Im Demo-Modus werden Daten lokal im Browser gespeichert; mit Supabase stehen Anmeldung und geräteübergreifende Synchronisierung zur Verfügung.

## Lokal starten

```bash
npm run dev
```

Öffne danach `http://localhost:4173`. Ohne Supabase-Konfiguration läuft die App automatisch im lokalen Demo-Modus.

## Supabase einrichten

1. Neues Supabase-Projekt erstellen.
2. Die Migration `supabase/migrations/20260808103000_initial_schema.sql` im SQL Editor ausführen oder über die Supabase CLI deployen.
3. Unter **Authentication → URL Configuration** als Site URL und erlaubte Redirect-URL
   die vollständige GitHub-Pages-Adresse inklusive Protokoll eintragen, zum Beispiel
   `https://esmo21.github.io/Packlisten/`. Die Redirect-URL ist nur für Auth-Flows
   relevant; sie stellt nicht die Verbindung zur Datenbank her.
4. Für die lokale Entwicklung Project URL und Publishable Key in `config.js` einsetzen. Die beiden Werte sind öffentliche Frontend-Konfiguration; echte Secret Keys gehören niemals in diese Datei.

Die Project URL muss die Form `https://PROJECT.supabase.co` haben (nicht die URL des
Supabase-Dashboards). Supabase Auth und die REST API erlauben Browserzugriffe bereits;
eine CORS-Browsererweiterung oder ein eigener Proxy ist nicht erforderlich. Bei einer
gehosteten App müssen die Build-Variablen gesetzt und die App danach neu deployt werden.

Nach der Anmeldung werden Änderungen in Supabase gespeichert und beim nächsten Aufruf
auf einem anderen Gerät wieder geladen. Dafür muss sich die andere Person mit demselben
Konto anmelden. Ein geteilter Website-Link allein gibt aus Datenschutzgründen keinen
Zugriff auf die persönlichen Listen.

Für einen Deployment-Build können die öffentlichen Werte als Umgebungsvariablen übergeben werden:

```bash
VITE_SUPABASE_URL=https://PROJECT.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
npm run build
```

## GitHub Actions Secrets

Für den Build werden benötigt:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Beide Werte sind für Frontend-Nutzung vorgesehen. Ein Supabase Secret Key oder `service_role` Key wird von der App **nicht** benötigt und darf niemals in den Frontend-Build gelangen.

Die Namen müssen unter **Repository → Settings → Secrets and variables → Actions**
als Repository Secrets (oder alternativ als Repository Variables) angelegt werden. Der
Wert von `VITE_SUPABASE_URL` ist die Supabase **Project URL**, nicht die GitHub-Pages-
oder Dashboard-URL. Anschließend den Workflow **Deploy to GitHub Pages** erneut
ausführen, weil die Konfiguration beim Build in `dist/config.js` geschrieben wird.

Der Deployment-Build bricht bewusst mit einer verständlichen Fehlermeldung ab, wenn
einer der beiden Werte fehlt oder die Project URL kein gültiges
`https://PROJECT.supabase.co`-Format hat. Dadurch wird nicht mehr unbemerkt eine
unkonfigurierte Demo-Version veröffentlicht.

### Fehlersuche bei GitHub Pages

1. In der letzten Actions-Ausführung prüfen, ob der Schritt `npm run build` erfolgreich
   war. Bei fehlenden Secrets nennt dieser Schritt jetzt die fehlenden Variablen.
2. In der veröffentlichten Seite die Browser-Entwicklerwerkzeuge öffnen. Zeigt die App
   **Lokaler Demo-Modus**, sind die Build-Werte nicht im Deployment angekommen.
3. Bei **Supabase-Anfrage fehlgeschlagen** kontrollieren, ob die Migration ausgeführt
   wurde. Bei **Invalid API key** den Publishable Key erneut aus den API-Einstellungen
   des gleichen Supabase-Projekts kopieren.
4. Falls die Werte als Environment Secrets statt als Repository Secrets angelegt
   wurden, sind sie für den Build-Job nicht verfügbar. Sie in Repository Secrets
   verschieben oder zusätzlich dort anlegen.
