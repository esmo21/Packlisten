import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
const { rm } = await import('node:fs/promises')
await rm('dist', { recursive: true, force: true })
await mkdir('dist/src', { recursive: true })
await cp('index.html', 'dist/index.html')
await cp('src', 'dist/src', { recursive: true })
const url = process.env.VITE_SUPABASE_URL || ''
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

if (process.env.REQUIRE_SUPABASE_CONFIG === '1') {
  if (!url || !key) {
    throw new Error('Supabase-Konfiguration fehlt: VITE_SUPABASE_URL und VITE_SUPABASE_PUBLISHABLE_KEY muessen fuer den Deployment-Build gesetzt sein.')
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    throw new Error('VITE_SUPABASE_URL muss die Project URL im Format https://PROJECT.supabase.co enthalten.')
  }
}

await writeFile('dist/config.js', `window.PACKFERTIG_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabasePublishableKey: key })}\n`)
const html = await readFile('dist/index.html', 'utf8')
if (!html.includes('./src/app.js')) throw new Error('Relative app entry missing')
console.log('Build completed: dist/')
