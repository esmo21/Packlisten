const url = globalThis.PACKFERTIG_CONFIG?.supabaseUrl || ''
const key = globalThis.PACKFERTIG_CONFIG?.supabasePublishableKey || ''
const sessionKey = 'packfertig_session'

export const isSupabaseConfigured = Boolean(url && key && !url.includes('your-project'))
export const getSession = () => JSON.parse(localStorage.getItem(sessionKey) || 'null')
export const clearSession = () => localStorage.removeItem(sessionKey)

async function request(path, options = {}, authenticated = false) {
  const session = getSession()
  const headers = { apikey: key, 'Content-Type': 'application/json', ...options.headers }
  if (authenticated && session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  const response = await fetch(`${url}${path}`, { ...options, headers })
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || 'Supabase-Anfrage fehlgeschlagen')
  return data
}

export async function authenticate(email, password, mode = 'login') {
  const endpoint = mode === 'signup' ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password'
  const data = await request(endpoint, { method: 'POST', body: JSON.stringify({ email, password }) })
  if (data.access_token) localStorage.setItem(sessionKey, JSON.stringify(data))
  return data
}

export async function loadCloudData() {
  const [templates, trips] = await Promise.all([
    request('/rest/v1/templates?select=*,template_items(*)&order=created_at.asc', {}, true),
    request('/rest/v1/trips?select=*,trip_items(*)&order=start_date.asc', {}, true),
  ])
  return {
    templates: templates.map(({ template_items, ...template }) => ({ ...template, items: template_items || [] })),
    trips: trips.map(({ trip_items, start_date, end_date, template_id, ...trip }) => ({ ...trip, startDate: start_date || '', endDate: end_date || '', templateId: template_id || '', items: trip_items || [] })),
  }
}

export async function saveCloudData(data) {
  const session = getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('Bitte erneut anmelden.')
  await request('/rest/v1/rpc/replace_user_data', {
    method: 'POST',
    body: JSON.stringify({ payload: data }),
  }, true)
}
