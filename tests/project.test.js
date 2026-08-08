import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
test('HTML loads the application module', async () => {
  const html = await readFile('index.html', 'utf8')
  assert.match(html, /src="\.\/src\/app\.js"/)
  assert.match(html, /href="\.\/src\/styles\.css"/)
  assert.match(html, /src="\.\/config\.js"/)
  assert.doesNotMatch(html, /(?:src|href)="\/(?:src\/|config\.js)/)
  assert.match(html, /lang="de"/)
})
test('database schema enables row level security', async () => {
  const sql = await readFile('supabase/migrations/20260808103000_initial_schema.sql', 'utf8')
  assert.equal((sql.match(/enable row level security/g) || []).length, 4)
  assert.match(sql, /auth\.uid\(\)/)
})
test('submit buttons are left to the submit handler', async () => {
  const app = await readFile('src/app.js', 'utf8')
  const clickHandler = app.indexOf("document.addEventListener('click'")
  const submitGuard = app.indexOf("target.matches('button[type=\"submit\"]')", clickHandler)
  const renderAfterClick = app.indexOf('render()', submitGuard)
  const submitHandler = app.indexOf("document.addEventListener('submit'", renderAfterClick)

  assert.ok(clickHandler >= 0)
  assert.ok(submitGuard > clickHandler, 'click handling must ignore submit buttons')
  assert.ok(renderAfterClick > submitGuard, 'the guard must run before click-triggered rendering')
  assert.ok(submitHandler > renderAfterClick)
})
test('Supabase URL is normalized and sessions load cloud data on startup', async () => {
  const client = await readFile('src/supabase.js', 'utf8')
  const app = await readFile('src/app.js', 'utf8')

  assert.match(client, /replace\(\/\\\/\+\$\/, ''\)/)
  assert.match(app, /async function useCloudData\(\)/)
  assert.match(app, /if \(isSupabaseConfigured && getSession\(\)\)/)
  assert.match(app, /await useCloudData\(\)/)
  assert.match(app, /cloudSave = cloudSave\.catch/)
})
