import { authenticate, clearSession, getSession, isSupabaseConfigured, loadCloudData, saveCloudData } from './supabase.js'

const icons = {
  logo: '<svg viewBox="0 0 32 32"><path d="M9 11V8a7 7 0 0 1 14 0v3"/><rect x="4" y="10" width="24" height="18" rx="5"/><path d="M4 18h24M11 15v6M21 15v6"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  trip: '<svg viewBox="0 0 24 24"><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 7h14a2 2 0 0 1 2 2v10H3V9a2 2 0 0 1 2-2ZM3 13h18M8 11v4M16 11v4"/></svg>',
  template: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="m4 16-1 5 5-1L20 8l-4-4zM14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M4 5h16v16H4zM8 3v4M16 3v4M4 10h16"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
}
const icon = (name) => `<span class="icon">${icons[name]}</span>`
const id = () => crypto.randomUUID()
const clone = (value) => JSON.parse(JSON.stringify(value))
const today = new Date().toISOString().slice(0, 10)
const demo = {
  templates: [
    { id: id(), name: 'Strandurlaub', icon: '☀️', color: 'sun', description: 'Sonne, Meer & Sand', items: ['Badebekleidung', 'Sonnencreme LSF 50', 'Sonnenbrille', 'Strandtuch', 'Flip-Flops', 'Reisepass'].map((name) => ({ id: id(), name })) },
    { id: id(), name: 'Wanderurlaub', icon: '⛰️', color: 'forest', description: 'Draußen unterwegs', items: ['Wanderschuhe', 'Regenjacke', 'Trinkflasche', 'Erste-Hilfe-Set', 'Wanderkarte'].map((name) => ({ id: id(), name })) },
    { id: id(), name: 'Winterurlaub', icon: '❄️', color: 'ice', description: 'Warm durch den Schnee', items: ['Winterjacke', 'Handschuhe', 'Mütze', 'Thermounterwäsche', 'Skibrille'].map((name) => ({ id: id(), name })) },
  ],
  trips: [],
}
const saved = localStorage.getItem('packfertig_data')
let state = saved ? JSON.parse(saved) : clone(demo)
if (!state.trips.length) {
  const template = state.templates[0]
  state.trips.push({ id: id(), name: 'Mallorca 2026', destination: 'Mallorca, Spanien', startDate: '2026-09-14', endDate: '2026-09-24', templateId: template.id, items: template.items.map((item, i) => ({ ...clone(item), id: id(), packed: i < 3 })) })
}
let view = { page: 'home', selectedId: null, modal: null, editId: null, editItemId: null, mobileNav: false, authMode: 'login' }
let cloudSave = Promise.resolve()

function persist() {
  localStorage.setItem('packfertig_data', JSON.stringify(state))
  localStorage.setItem('packfertig_has_changes', 'true')
  if (isSupabaseConfigured && getSession()) {
    const snapshot = clone(state)
    cloudSave = cloudSave.catch(() => {}).then(() => saveCloudData(snapshot))
    cloudSave.catch((error) => toast(`Cloud-Synchronisierung fehlgeschlagen: ${error.message}`, 'error'))
  }
  return cloudSave
}

async function useCloudData() {
  const cloud = await loadCloudData()
  const cloudHasData = cloud.templates.length > 0 || cloud.trips.length > 0
  if (cloudHasData) state = cloud
  else if (localStorage.getItem('packfertig_has_changes') === 'true') await saveCloudData(state)
  else state = { templates: [], trips: [] }
  localStorage.setItem('packfertig_data', JSON.stringify(state))
  localStorage.removeItem('packfertig_has_changes')
}
const esc = (s = '') => String(s).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c])
const formatDate = (date) => date ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) : 'Noch offen'
const progress = (trip) => trip.items.length ? Math.round(trip.items.filter((i) => i.packed).length / trip.items.length * 100) : 0
function toast(message, type = 'success') {
  const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message
  document.querySelector('#toast-region').append(el); setTimeout(() => el.remove(), 3000)
}

function sidebar() {
  return `<aside class="sidebar ${view.mobileNav ? 'open' : ''}">
    <div class="brand">${icon('logo')}<span>Packfertig</span><button class="icon-btn mobile-close" data-action="nav-close">${icon('close')}</button></div>
    <nav><button class="nav-item ${view.page === 'home' ? 'active' : ''}" data-page="home">${icon('home')}Übersicht</button>
    <div class="nav-label">Meine Reisen</div>
    <button class="nav-item ${view.page === 'trips' || view.page === 'trip' ? 'active' : ''}" data-page="trips">${icon('trip')}Alle Reisen <span class="count">${state.trips.length}</span></button>
    <div class="nav-label">Organisation</div>
    <button class="nav-item ${view.page === 'templates' || view.page === 'template' ? 'active' : ''}" data-page="templates">${icon('template')}Vorlagen <span class="count">${state.templates.length}</span></button></nav>
    <div class="sidebar-bottom"><div class="sync-dot ${isSupabaseConfigured && getSession() ? 'online' : ''}"></div><div><strong>${isSupabaseConfigured ? (getSession() ? 'Cloud verbunden' : 'Nicht angemeldet') : 'Lokaler Demo-Modus'}</strong><small>${isSupabaseConfigured ? 'Supabase Sync' : 'Daten im Browser'}</small></div>${isSupabaseConfigured ? `<button class="text-btn" data-action="auth">${getSession() ? 'Abmelden' : 'Login'}</button>` : ''}</div>
  </aside><div class="nav-overlay ${view.mobileNav ? 'show' : ''}" data-action="nav-close"></div>`
}
function topbar(title, subtitle = '') {
  return `<header class="topbar"><button class="icon-btn menu-btn" data-action="nav-open">${icon('menu')}</button><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div><div class="avatar">${icon('user')}</div></header>`
}
function tripCard(trip) {
  const p = progress(trip)
  return `<article class="trip-card" data-open-trip="${trip.id}"><div class="trip-card-top"><span class="eyebrow">${p === 100 ? 'Bereit zur Abreise' : 'Nächste Reise'}</span><button class="more" aria-label="Reise bearbeiten" data-edit-trip="${trip.id}">•••</button></div><h3>${esc(trip.name)}</h3><p class="destination">${esc(trip.destination || 'Reiseziel offen')}</p><div class="date-row">${icon('calendar')} ${formatDate(trip.startDate)}${trip.endDate ? ` – ${formatDate(trip.endDate)}` : ''}</div><div class="progress-meta"><span>${trip.items.filter(i => i.packed).length} von ${trip.items.length} gepackt</span><strong>${p}%</strong></div><div class="progress"><i style="width:${p}%"></i></div></article>`
}
function templateCard(t) {
  return `<article class="template-card" data-open-template="${t.id}"><div class="template-icon ${t.color}">${t.icon}</div><div><h3>${esc(t.name)}</h3><p>${esc(t.description || `${t.items.length} Dinge`)}</p></div><span class="item-badge">${t.items.length} Dinge</span><button class="mini-edit" data-edit-template="${t.id}" aria-label="Vorlage bearbeiten">${icon('edit')}</button></article>`
}
function home() {
  const next = [...state.trips].sort((a,b) => a.startDate.localeCompare(b.startDate))[0]
  return `${topbar('Hallo, Reisefreund!', 'Was steht als Nächstes an?')}<main class="content">
    <section class="hero"><div><span class="kicker">GUT VORBEREITET</span><h2>Packen ohne<br><em>etwas zu vergessen.</em></h2><p>Deine Vorlagen, deine Reisen – alles an einem Ort.</p><button class="primary" data-new-trip>${icon('plus')} Neue Reise planen</button></div><div class="hero-art"><div class="sun"></div><div class="mountain back"></div><div class="mountain front"></div><div class="case">${icon('logo')}</div><span class="cloud c1"></span><span class="cloud c2"></span></div></section>
    <div class="section-head"><div><span class="kicker">DEIN NÄCHSTES ABENTEUER</span><h2>Bereit zum Losziehen?</h2></div><button class="link-btn" data-page="trips">Alle Reisen ansehen →</button></div>
    ${next ? tripCard(next) : '<div class="empty"><span>🧳</span><h3>Noch keine Reise geplant</h3><p>Erstelle deine erste Packliste aus einer Vorlage.</p></div>'}
    <div class="section-head template-head"><div><span class="kicker">SCHNELL STARTEN</span><h2>Deine Vorlagen</h2></div><button class="link-btn" data-page="templates">Alle Vorlagen →</button></div>
    <div class="template-grid">${state.templates.slice(0,3).map(templateCard).join('')}</div>
  </main>`
}
function listPage(type) {
  const trips = type === 'trips'
  const title = trips ? 'Meine Reisen' : 'Packlisten-Vorlagen'
  const sub = trips ? 'Behalte bei allen Abenteuern den Überblick.' : 'Einmal erstellen, für jede Reise wiederverwenden.'
  return `${topbar(title, sub)}<main class="content"><div class="page-actions"><div><span class="kicker">${trips ? `${state.trips.length} GEPLANTE REISEN` : `${state.templates.length} VORLAGEN`}</span></div><button class="primary" ${trips ? 'data-new-trip' : 'data-new-template'}>${icon('plus')} ${trips ? 'Neue Reise' : 'Neue Vorlage'}</button></div><div class="${trips ? 'trips-grid' : 'template-grid full'}">${(trips ? state.trips.map(tripCard) : state.templates.map(templateCard)).join('')}</div>${!(trips ? state.trips : state.templates).length ? `<div class="empty"><span>${trips ? '🧳' : '📋'}</span><h3>Noch nichts hier</h3><p>Lege jetzt den ersten Eintrag an.</p></div>` : ''}</main>`
}
function detail(type) {
  const isTrip = type === 'trip', obj = (isTrip ? state.trips : state.templates).find(x => x.id === view.selectedId)
  if (!obj) { view.page = isTrip ? 'trips' : 'templates'; return listPage(view.page) }
  const packed = isTrip ? obj.items.filter(i => i.packed).length : 0
  return `${topbar(esc(obj.name), isTrip ? esc(obj.destination) : esc(obj.description))}<main class="content"><button class="back" data-page="${isTrip ? 'trips' : 'templates'}">← Zurück</button>
    <section class="detail-head"><div class="detail-symbol ${isTrip ? 'coral' : obj.color}">${isTrip ? '🧳' : obj.icon}</div><div><span class="kicker">${isTrip ? 'REISE-PACKLISTE' : 'VORLAGE'}</span><h2>${esc(obj.name)}</h2>${isTrip ? `<p>${formatDate(obj.startDate)} – ${formatDate(obj.endDate)}</p>` : `<p>${obj.items.length} Dinge für deine nächste Reise</p>`}</div><button class="secondary" data-action="edit-current">${icon('edit')} Bearbeiten</button><button class="danger-icon" data-action="delete-current">${icon('trash')}</button></section>
    ${isTrip ? `<section class="packing-progress"><div><strong>${progress(obj)}%</strong><span>gepackt</span></div><div class="progress large"><i style="width:${progress(obj)}%"></i></div><p>${packed} von ${obj.items.length} Dingen sind im Koffer</p></section>` : ''}
    <section class="checklist"><div class="checklist-title"><h3>${isTrip ? 'Was noch in den Koffer muss' : 'Dinge in dieser Vorlage'}</h3><button class="link-btn" data-action="add-item">+ Sache hinzufügen</button></div><div class="items">${obj.items.map((item) => `<div class="check-item ${item.packed ? 'done' : ''}">${isTrip ? `<label class="check-toggle"><input type="checkbox" data-check="${item.id}" ${item.packed ? 'checked' : ''}><span class="custom-check">${icon('check')}</span><span>${esc(item.name)}</span></label>` : `<span class="dot"></span><span>${esc(item.name)}</span>`}<div class="item-actions"><button data-edit-item="${item.id}" aria-label="${esc(item.name)} bearbeiten">${icon('edit')}</button><button data-delete-item="${item.id}" aria-label="${esc(item.name)} löschen">${icon('trash')}</button></div></div>`).join('')}</div>${!obj.items.length ? '<div class="empty small"><p>Diese Liste ist noch leer.</p></div>' : ''}</section>
  </main>`
}
function modal() {
  if (!view.modal) return ''
  if (view.modal === 'auth') return `<div class="modal-wrap"><div class="modal auth-modal"><button class="modal-close" data-action="modal-close">${icon('close')}</button><span class="modal-symbol">${icon('logo')}</span><span class="kicker">CLOUD-SYNCHRONISIERUNG</span><h2>${view.authMode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</h2><p>Deine Listen sind so auf allen Geräten verfügbar.</p><form id="auth-form"><label>E-Mail<input name="email" type="email" required placeholder="du@beispiel.de"></label><label>Passwort<input name="password" type="password" required minlength="6" placeholder="Mindestens 6 Zeichen"></label><button class="primary wide" type="submit">${view.authMode === 'login' ? 'Anmelden' : 'Registrieren'}</button></form><button class="auth-switch" data-action="auth-switch">${view.authMode === 'login' ? 'Noch kein Konto? Jetzt registrieren' : 'Schon registriert? Jetzt anmelden'}</button></div></div>`
  if (view.modal === 'item') {
    const obj = (view.page === 'trip' ? state.trips : state.templates).find(x => x.id === view.selectedId)
    const item = obj?.items.find(x => x.id === view.editItemId)
    return `<div class="modal-wrap"><div class="modal small-modal"><button class="modal-close" data-action="modal-close">${icon('close')}</button><span class="kicker">${item ? 'EINTRAG BEARBEITEN' : 'LISTE ERGÄNZEN'}</span><h2>${item ? 'Sache bearbeiten' : 'Neue Sache'}</h2><form id="item-form"><label>Was möchtest du einpacken?<input name="name" required autofocus value="${esc(item?.name)}" placeholder="z. B. Sonnenhut"></label><button class="primary wide" type="submit">${item ? 'Änderungen speichern' : 'Hinzufügen'}</button></form></div></div>`
  }
  const tripMode = view.modal === 'trip'; const data = (tripMode ? state.trips : state.templates).find(x => x.id === view.editId)
  return `<div class="modal-wrap"><div class="modal"><button class="modal-close" data-action="modal-close">${icon('close')}</button><span class="kicker">${data ? 'BEARBEITEN' : 'NEU ANLEGEN'}</span><h2>${data ? (tripMode ? 'Reise bearbeiten' : 'Vorlage bearbeiten') : (tripMode ? 'Wohin geht es?' : 'Neue Vorlage')}</h2><p>${tripMode ? 'Plane dein nächstes Abenteuer und starte gut vorbereitet.' : 'Erstelle eine Packliste, die du immer wieder nutzen kannst.'}</p><form id="entity-form">
    <label>${tripMode ? 'Name der Reise' : 'Name der Vorlage'}<input name="name" required value="${esc(data?.name)}" placeholder="${tripMode ? 'z. B. Mallorca 2026' : 'z. B. Städtetrip'}"></label>
    ${tripMode ? `<label>Reiseziel<input name="destination" value="${esc(data?.destination)}" placeholder="z. B. Mallorca, Spanien"></label><div class="form-row"><label>Von<input name="startDate" type="date" value="${data?.startDate || today}"></label><label>Bis<input name="endDate" type="date" value="${data?.endDate || ''}"></label></div><label>Vorlage<select name="templateId"><option value="">Ohne Vorlage starten</option>${state.templates.map(t => `<option value="${t.id}" ${data?.templateId === t.id ? 'selected' : ''}>${t.icon} ${esc(t.name)} (${t.items.length})</option>`).join('')}</select></label>` : `<label>Beschreibung<input name="description" value="${esc(data?.description)}" placeholder="z. B. Für lange Wochenenden"></label><div class="form-row"><label>Symbol<select name="emoji">${['🎒','🏕️','🏙️','🚲','✈️','☀️','⛰️','❄️'].map(e => `<option ${data?.icon === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label><label>Farbe<select name="color">${['forest','sun','ice','coral'].map(c => `<option value="${c}" ${data?.color === c ? 'selected' : ''}>${({forest:'Waldgrün',sun:'Sonnengelb',ice:'Eisblau',coral:'Koralle'})[c]}</option>`).join('')}</select></label></div>`}
    <button class="primary wide" type="submit">${data ? 'Änderungen speichern' : (tripMode ? 'Reise erstellen' : 'Vorlage erstellen')}</button></form></div></div>`
}
function render() {
  let body = view.page === 'home' ? home() : view.page === 'trips' || view.page === 'templates' ? listPage(view.page) : detail(view.page)
  document.querySelector('#app').innerHTML = `${sidebar()}<div class="shell">${body}</div>${modal()}`
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('button,[data-open-trip],[data-open-template]'); if (!target) return
  // Do not re-render a form before the browser can dispatch its submit event.
  if (target.matches('button[type="submit"]')) return
  if (target.dataset.page) { view.page = target.dataset.page; view.selectedId = null; view.mobileNav = false }
  if (target.dataset.openTrip) { view.page = 'trip'; view.selectedId = target.dataset.openTrip }
  if (target.dataset.openTemplate) { view.page = 'template'; view.selectedId = target.dataset.openTemplate }
  if (target.dataset.newTrip !== undefined) { view.modal = 'trip'; view.editId = null }
  if (target.dataset.newTemplate !== undefined) { view.modal = 'template'; view.editId = null }
  if (target.dataset.editTrip) { e.stopPropagation(); view.modal = 'trip'; view.editId = target.dataset.editTrip }
  if (target.dataset.editTemplate) { e.stopPropagation(); view.modal = 'template'; view.editId = target.dataset.editTemplate }
  const action = target.dataset.action
  if (action === 'nav-open') view.mobileNav = true
  if (action === 'nav-close') view.mobileNav = false
  if (action === 'modal-close') { view.modal = null; view.editId = null; view.editItemId = null }
  if (action === 'edit-current') { view.modal = view.page; view.editId = view.selectedId }
  if (action === 'add-item') { view.modal = 'item'; view.editItemId = null }
  if (action === 'delete-current' && confirm('Möchtest du diesen Eintrag wirklich löschen?')) {
    const collection = view.page === 'trip' ? state.trips : state.templates
    collection.splice(collection.findIndex(x => x.id === view.selectedId), 1); view.page = view.page === 'trip' ? 'trips' : 'templates'; persist(); toast('Eintrag gelöscht')
  }
  if (target.dataset.deleteItem) {
    e.preventDefault(); const obj = (view.page === 'trip' ? state.trips : state.templates).find(x => x.id === view.selectedId)
    obj.items = obj.items.filter(i => i.id !== target.dataset.deleteItem); persist(); toast('Sache entfernt')
  }
  if (target.dataset.editItem) {
    e.preventDefault(); view.modal = 'item'; view.editItemId = target.dataset.editItem
  }
  if (action === 'auth') { if (getSession()) { clearSession(); localStorage.removeItem('packfertig_data'); localStorage.removeItem('packfertig_has_changes'); state = clone(demo); toast('Du wurdest abgemeldet') } else view.modal = 'auth' }
  if (action === 'auth-switch') view.authMode = view.authMode === 'login' ? 'signup' : 'login'
  render()
})
document.addEventListener('change', (e) => {
  if (!e.target.dataset.check) return
  const trip = state.trips.find(x => x.id === view.selectedId), item = trip.items.find(i => i.id === e.target.dataset.check)
  item.packed = e.target.checked; persist(); render(); if (progress(trip) === 100) toast('Alles gepackt – gute Reise! 🎉')
})
document.addEventListener('submit', async (e) => {
  e.preventDefault(); const form = new FormData(e.target)
  if (e.target.id === 'entity-form') {
    const isTrip = view.modal === 'trip', collection = isTrip ? state.trips : state.templates, existing = collection.find(x => x.id === view.editId)
    if (existing) Object.assign(existing, isTrip ? { name: form.get('name'), destination: form.get('destination'), startDate: form.get('startDate'), endDate: form.get('endDate'), templateId: form.get('templateId') } : { name: form.get('name'), description: form.get('description'), icon: form.get('emoji'), color: form.get('color') })
    else if (isTrip) { const template = state.templates.find(t => t.id === form.get('templateId')); collection.push({ id: id(), name: form.get('name'), destination: form.get('destination'), startDate: form.get('startDate'), endDate: form.get('endDate'), templateId: form.get('templateId'), items: template ? template.items.map(i => ({ ...clone(i), id: id(), packed: false })) : [] }) }
    else collection.push({ id: id(), name: form.get('name'), description: form.get('description'), icon: form.get('emoji'), color: form.get('color'), items: [] })
    view.modal = null; view.editId = null; persist(); toast(existing ? 'Änderungen gespeichert' : 'Erfolgreich erstellt')
  }
  if (e.target.id === 'item-form') {
    const obj = (view.page === 'trip' ? state.trips : state.templates).find(x => x.id === view.selectedId)
    const item = obj.items.find(x => x.id === view.editItemId)
    if (item) item.name = form.get('name')
    else obj.items.push({ id: id(), name: form.get('name'), ...(view.page === 'trip' ? { packed: false } : {}) })
    view.modal = null; view.editItemId = null; persist(); toast(item ? 'Änderungen gespeichert' : 'Sache hinzugefügt')
  }
  if (e.target.id === 'auth-form') { try { const result = await authenticate(form.get('email'), form.get('password'), view.authMode); if (result.access_token) { await useCloudData(); view.modal = null; toast('Erfolgreich angemeldet – Cloud-Synchronisierung aktiv') } else toast('Bitte bestätige deine E-Mail.', 'success') } catch (error) { toast(error.message, 'error') } }
  render()
})

async function start() {
  if (isSupabaseConfigured && getSession()) {
    try { await useCloudData() }
    catch (error) { toast(`Cloud-Daten konnten nicht geladen werden: ${error.message}`, 'error') }
  }
  render()
}
start()
