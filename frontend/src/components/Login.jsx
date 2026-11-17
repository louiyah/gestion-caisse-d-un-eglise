import { useState } from 'react'
import { BarChart3, Eye, EyeOff, FileText, LogIn, Lock, PieChart, ShieldCheck, User } from 'lucide-react'
import { api, setToken } from '../api'
import { Modal } from './ui'

const AVANTAGES = [
  { icon: BarChart3, texte: 'Suivi des entrées et sorties' },
  { icon: FileText, texte: 'Gestion des églises' },
  { icon: PieChart, texte: 'Rapports détaillés' },
  { icon: ShieldCheck, texte: 'Sécurité et fiabilité' },
]

function Eglise({ size = 96 }) {
  return (
    <svg viewBox="0 0 120 90" width={size} height={size * 0.75} aria-hidden="true">
      <path d="M14 78 A46 46 0 0 1 106 78" fill="none" stroke="#F5B73B" strokeWidth="3" />
      <rect x="52" y="6" width="3" height="14" fill="#fff" />
      <rect x="47" y="11" width="13" height="3" fill="#fff" />
      <path d="M40 78 V42 L53.5 28 L67 42 V78 Z" fill="#fff" />
      <path d="M20 78 V56 L40 48 V78 Z" fill="#DCE7FF" />
      <path d="M67 48 L87 56 V78 H67 Z" fill="#DCE7FF" />
      <path d="M49 78 V60 a4.5 4.5 0 0 1 9 0 V78 Z" fill="#1D4ED8" />
      <path d="M4 80 Q60 70 116 80" fill="none" stroke="#F5B73B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function CroixBible() {
  return (
    <svg viewBox="0 0 140 100" width="128" height="92" aria-hidden="true">
      <g stroke="#F5B73B" strokeWidth="3" strokeLinecap="round">
        <path d="M70 6 V14" /><path d="M47 14 L52 20" /><path d="M93 14 L88 20" />
        <path d="M36 32 L44 34" /><path d="M104 32 L96 34" />
      </g>
      <rect x="64" y="18" width="12" height="46" rx="2" fill="#F5A524" />
      <rect x="52" y="30" width="36" height="11" rx="2" fill="#F5A524" />
      <path d="M12 70 L68 80 V52 L22 44 Z" fill="#DCE9FF" stroke="#1D4ED8" strokeWidth="3" strokeLinejoin="round" />
      <path d="M128 70 L72 80 V52 L118 44 Z" fill="#EAF1FF" stroke="#1D4ED8" strokeWidth="3" strokeLinejoin="round" />
      <path d="M6 76 L68 90 L134 76 L128 70 L70 82 L12 70 Z" fill="#1D4ED8" />
    </svg>
  )
}

export default function Login({ onConnecte }) {
  const [identifiant, setIdentifiant] = useState('')
  const [mdp, setMdp] = useState('')
  const [voir, setVoir] = useState(false)
  const [souvenir, setSouvenir] = useState(true)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [oublie, setOublie] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErreur('')
    setOccupe(true)
    try {
      const r = await api.login({ identifiant, mot_de_passe: mdp, souvenir })
      setToken(r.token, souvenir)
      onConnecte(r.utilisateur)
    } catch (err) {
      setErreur(err instanceof TypeError
        ? 'Le serveur démarre ou est injoignable. Patientez quelques secondes puis réessayez.'
        : err.message)
    }
    setOccupe(false)
  }

  return (
    <div className="login">
      <section className="login-hero">
        <div className="login-titre">
          <Eglise size={150} />
          <h1>Gestion de Caisse<br />d'une <em>Église</em></h1>
        </div>
        <p className="login-slogan">Gérez simplement et efficacement<br />les finances de votre église.</p>
        <hr />
        <ul>
          {AVANTAGES.map(({ icon: Icon, texte }) => (
            <li key={texte}><span><Icon size={22} /></span>{texte}</li>
          ))}
        </ul>
        <blockquote>
          « Car là où est ton trésor,<br />là aussi sera ton cœur. »
          <cite>Matthieu 6:21</cite>
        </blockquote>
      </section>

      <section className="login-card">
        <CroixBible />
        <h2>Connexion</h2>
        <p className="login-sous">Accédez à votre espace de gestion</p>
        <div className="login-sep"><i /></div>

        <form onSubmit={submit}>
          <label className="champ">
            <User size={20} />
            <input autoFocus required placeholder="Matricule ou Nom d'utilisateur" autoComplete="username"
              value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} />
          </label>
          <label className="champ">
            <Lock size={20} />
            <input required type={voir ? 'text' : 'password'} placeholder="Mot de passe" autoComplete="current-password"
              value={mdp} onChange={(e) => setMdp(e.target.value)} />
            <button type="button" className="oeil" onClick={() => setVoir(!voir)}
              aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {voir ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </label>

          <div className="login-options">
            <label className="check">
              <input type="checkbox" checked={souvenir} onChange={(e) => setSouvenir(e.target.checked)} />
              Se souvenir de moi
            </label>
            <button type="button" className="link-bleu" onClick={() => setOublie(true)}>Mot de passe oublié ?</button>
          </div>

          {erreur && <p className="erreur" role="alert">{erreur}</p>}

          <button className="btn-connexion" disabled={occupe}>
            <LogIn size={22} /> {occupe ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="ou"><span>Ou</span></div>
        <div className="secure"><ShieldCheck size={18} /> Application sécurisée • Version 1.0.0</div>
      </section>

      {oublie && (
        <Modal titre="Mot de passe oublié" onClose={() => setOublie(false)}>
          <p>Pour des raisons de sécurité, le mot de passe est réinitialisé par l'administrateur de l'application.</p>
          <p className="hint" style={{ marginTop: 10 }}>Sur l'ordinateur où l'application est installée, ouvrez un terminal dans le dossier <b>backend</b> et lancez :</p>
          <pre className="code">python reset_password.py admin NouveauMotDePasse</pre>
          <div className="form-actions"><button className="btn primary" onClick={() => setOublie(false)}>Compris</button></div>
        </Modal>
      )}
    </div>
  )
}
