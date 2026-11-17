export const API = 'http://127.0.0.1:8000/api'

// ---------- Session : jeton en localStorage (« Se souvenir de moi ») ou sessionStorage ----------
const CLE = 'caisse_token'
export const getToken = () => localStorage.getItem(CLE) || sessionStorage.getItem(CLE) || ''
export const setToken = (token, souvenir) => {
  clearToken()
  ;(souvenir ? localStorage : sessionStorage).setItem(CLE, token)
}
export const clearToken = () => { localStorage.removeItem(CLE); sessionStorage.removeItem(CLE) }

const authHeaders = () => (getToken() ? { Authorization: `Bearer ${getToken()}` } : {})

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  })
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    clearToken()
    window.dispatchEvent(new Event('auth:logout'))
  }
  if (!res.ok) {
    let message = `Erreur ${res.status}`
    try {
      const body = await res.json()
      message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch { /* pas de JSON */ }
    throw new Error(message)
  }
  return res.status === 204 ? null : res.json()
}

const qs = (params = {}, avecToken = false) => {
  const p = new URLSearchParams()
  if (avecToken && getToken()) p.set('token', getToken())
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && p.set(k, v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

const body = (data) => JSON.stringify(data)

export const api = {
  login: (d) => request('/auth/login', { method: 'POST', body: body(d) }),
  moi: () => request('/auth/me'),
  changerMotDePasse: (d) => request('/auth/change-password', { method: 'POST', body: body(d) }),
  stats: (params) => request(`/stats${qs(params)}`),
  eglises: () => request('/eglises'),
  creerEglise: (d) => request('/eglises', { method: 'POST', body: body(d) }),
  modifierEglise: (id, d) => request(`/eglises/${id}`, { method: 'PUT', body: body(d) }),
  supprimerEglise: (id) => request(`/eglises/${id}`, { method: 'DELETE' }),

  entrees: (params) => request(`/entrees${qs(params)}`),
  creerEntree: (d) => request('/entrees', { method: 'POST', body: body(d) }),
  modifierEntree: (id, d) => request(`/entrees/${id}`, { method: 'PUT', body: body(d) }),
  supprimerEntree: (id) => request(`/entrees/${id}`, { method: 'DELETE' }),

  creerSortie: (d) => request('/sorties', { method: 'POST', body: body(d) }),
  modifierSortie: (id, d) => request(`/sorties/${id}`, { method: 'PUT', body: body(d) }),
  supprimerSortie: (id) => request(`/sorties/${id}`, { method: 'DELETE' }),

  mouvements: (params) => request(`/mouvements${qs(params)}`),
  histogramme: (params) => request(`/rapports/histogramme-data${qs(params)}`),
  histogrammeUrl: (params) => `${API}/rapports/histogramme.png${qs(params, true)}`,
  rapportUrl: (type, params) => `${API}/rapports/${type}${qs(params)}`,
}

/** Télécharge un fichier généré par le backend (PDF / Excel). */
export async function telecharger(url, nomFichier) {
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Échec du téléchargement (${res.status})`)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nomFichier
  a.click()
  URL.revokeObjectURL(a.href)
}

/** 325000 -> "325.000 Ar" */
export const ar = (n) => `${Math.round(n ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} Ar`
export const nombre = (n) => Math.round(n ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** "2023-03-15" -> "15/03/2023" */
export const dateFr = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
