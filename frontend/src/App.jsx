import { useCallback, useEffect, useState } from 'react'
import { Bell, CalendarDays } from 'lucide-react'
import { api, API, clearToken, getToken } from './api'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import StatCards from './components/StatCards'
import EglisesPanel from './components/EglisesPanel'
import { ListeTraitements, NouveauTraitement } from './components/TraitementsPanel'
import MouvementsPanel from './components/MouvementsPanel'
import RapportsPanel from './components/RapportsPanel'

function ChangerMotDePasse({ notify }) {
  const [f, setF] = useState({ ancien: '', nouveau: '', confirmation: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    if (f.nouveau !== f.confirmation) return notify('La confirmation ne correspond pas', true)
    try {
      await api.changerMotDePasse({ ancien: f.ancien, nouveau: f.nouveau })
      notify('Mot de passe modifié')
      setF({ ancien: '', nouveau: '', confirmation: '' })
    } catch (err) { notify(err.message, true) }
  }
  return (
    <form className="form" onSubmit={submit} style={{ maxWidth: 380, marginTop: 22 }}>
      <h3 style={{ color: '#1e3a8a' }}>Changer le mot de passe</h3>
      <label>Ancien mot de passe<input required type="password" autoComplete="current-password" value={f.ancien} onChange={set('ancien')} /></label>
      <label>Nouveau mot de passe (6 caractères min.)<input required minLength={6} type="password" autoComplete="new-password" value={f.nouveau} onChange={set('nouveau')} /></label>
      <label>Confirmer<input required minLength={6} type="password" autoComplete="new-password" value={f.confirmation} onChange={set('confirmation')} /></label>
      <div className="form-actions"><button className="btn primary">Enregistrer</button></div>
    </form>
  )
}

const TITRES = {
  dashboard: ['Gestion de Caisse d’une Église', 'Suivi des contributions et des mouvements de caisse'],
  eglises: ['Églises', 'Création et suivi des soldes par église'],
  traitements: ['Traitements', 'Enregistrement et historique des entrées'],
  mouvements: ['Mouvements de caisse', 'Entrées et sorties, recherche par motif'],
  rapports: ['Rapports', 'Mouvement de caisse entre deux dates, exports et histogramme'],
  parametres: ['Paramètres', 'Configuration de l’application'],
  apropos: ['À propos', 'Gestion de caisse d’une église'],
}

const dateDuJour = () => {
  const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [periode, setPeriode] = useState({ debut: '', fin: '' })
  const [eglises, setEglises] = useState([])
  const [traitements, setTraitements] = useState([])
  const [stats, setStats] = useState(null)
  const [version, setVersion] = useState(0)
  const [toast, setToast] = useState(null)
  const [hors, setHors] = useState(false)
  const [user, setUser] = useState(null)
  const [sessionVerifiee, setSessionVerifiee] = useState(!getToken())

  const notify = useCallback((message, erreur = false) => {
    setToast({ message, erreur })
    setTimeout(() => setToast(null), erreur ? 6000 : 2800)
  }, [])

  // Au démarrage : si un jeton existe (« Se souvenir de moi »), on le valide.
  useEffect(() => {
    if (!getToken()) return
    const essayer = (n) =>
      api.moi()
        .then(setUser)
        .catch((e) => {
          if (e instanceof TypeError && n > 0) return setTimeout(() => essayer(n - 1), 1500) // backend en démarrage
        })
        .finally(() => setSessionVerifiee(true))
    essayer(8)
  }, [])

  useEffect(() => {
    const out = () => setUser(null)
    window.addEventListener('auth:logout', out)
    return () => window.removeEventListener('auth:logout', out)
  }, [])

  const deconnecter = () => { clearToken(); setUser(null); setPage('dashboard') }

  const charger = useCallback(async () => {
    if (!user) return
    try {
      const [e, t, s] = await Promise.all([
        api.eglises(), api.entrees(), api.stats({ debut: periode.debut, fin: periode.fin }),
      ])
      setEglises(e); setTraitements(t); setStats(s); setHors(false)
    } catch (err) {
      setHors(true)
    }
  }, [user, periode.debut, periode.fin])

  useEffect(() => { charger() }, [charger, version])
  // Au démarrage le backend peut mettre quelques secondes (connexion Supabase) : on réessaie.
  useEffect(() => {
    if (!hors || !user) return
    const t = setInterval(charger, 2500)
    return () => clearInterval(t)
  }, [hors, user, charger])

  const onChange = () => setVersion((v) => v + 1)
  const [titre, sousTitre] = TITRES[page]
  const showAll = page === 'dashboard'

  if (!sessionVerifiee) return <div className="chargement">Chargement…</div>
  if (!user) return <Login onConnecte={setUser} />

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={setPage} user={user} onLogout={deconnecter} />
      <main>
        <header className="topbar">
          <div>
            <h1>{titre}</h1>
            <p>{sousTitre}</p>
          </div>
          <div className="topbar-right">
            <div className="date-chip"><CalendarDays size={16} /> {dateDuJour()}</div>
            <button className="bell" aria-label="Notifications"><Bell size={18} /><i /></button>
          </div>
        </header>

        {hors && (
          <div className="banner">
            Connexion au serveur impossible. Vérifiez le backend et le fichier <code>backend/.env</code> (DATABASE_URL Supabase). Nouvelle tentative…
          </div>
        )}

        {['dashboard', 'eglises', 'traitements', 'mouvements', 'rapports'].includes(page) && (
          <StatCards stats={stats} periode={periode} onPeriode={setPeriode} />
        )}

        {showAll && (
          <div className="grid-dashboard">
            <EglisesPanel eglises={eglises} onChange={onChange} notify={notify} />
            <NouveauTraitement eglises={eglises} traitements={traitements} periode={periode} onChange={onChange} notify={notify} />
            <ListeTraitements eglises={eglises} traitements={traitements} periode={periode} onChange={onChange} notify={notify} />
            <MouvementsPanel eglises={eglises} periode={periode} version={version} onChange={onChange} notify={notify} />
            <div className="full"><RapportsPanel periode={periode} eglises={eglises} /></div>
          </div>
        )}

        {page === 'eglises' && <EglisesPanel eglises={eglises} onChange={onChange} notify={notify} />}
        {page === 'traitements' && (
          <div className="grid-2">
            <NouveauTraitement eglises={eglises} traitements={traitements} periode={periode} onChange={onChange} notify={notify} />
            <ListeTraitements eglises={eglises} traitements={traitements} periode={periode} onChange={onChange} notify={notify} />
          </div>
        )}
        {page === 'mouvements' && (
          <MouvementsPanel eglises={eglises} periode={periode} version={version} onChange={onChange} notify={notify} />
        )}
        {page === 'rapports' && <RapportsPanel periode={periode} eglises={eglises} complet />}

        {page === 'parametres' && (
          <section className="panel">
            <dl className="dl">
              <dt>Adresse de l’API</dt><dd>{API}</dd>
              <dt>Seuil minimal du solde</dt><dd>{stats ? `${stats.seuil_minimal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} Ar` : '—'}</dd>
              <dt>Base de données</dt><dd>Supabase PostgreSQL (configurée dans backend/.env)</dd>
              <dt>Compte connecté</dt><dd>{user.nom} ({user.username}{user.matricule ? ` · ${user.matricule}` : ''})</dd>
            </dl>
            <ChangerMotDePasse notify={notify} />
          </section>
        )}
        {page === 'apropos' && (
          <section className="panel">
            <p>Application desktop de gestion de caisse d’une église : suivi des soldes, des entrées et des sorties,
              rapports PDF / Excel et histogramme.</p>
            <p className="hint">Electron · React · FastAPI · SQLAlchemy · Supabase PostgreSQL</p>
          </section>
        )}
      </main>
      {toast && <div className={`toast ${toast.erreur ? 'err' : ''}`}>{toast.message}</div>}
    </div>
  )
}
