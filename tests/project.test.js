import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
test('HTML loads the application module', async () => {
  const html = await readFile('index.html', 'utf8')
  assert.match(html, /src\/app\.js/)
  assert.match(html, /lang="de"/)
})
test('database schema enables row level security', async () => {
  const sql = await readFile('supabase/migrations/20260808103000_initial_schema.sql', 'utf8')
  assert.equal((sql.match(/enable row level security/g) || []).length, 4)
  assert.match(sql, /auth\.uid\(\)/)
})
