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
3. Unter **Authentication → URL Configuration** die Website- und Redirect-URL hinterlegen.
4. Für die lokale Entwicklung Project URL und Publishable Key in `config.js` einsetzen. Die beiden Werte sind öffentliche Frontend-Konfiguration; echte Secret Keys gehören niemals in diese Datei.

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
