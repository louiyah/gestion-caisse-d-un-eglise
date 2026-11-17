import { ArrowLeftRight, BarChart3, ClipboardList, Church, Home, Info, LogOut, Settings, User } from 'lucide-react'

const MENU = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Home },
  { id: 'eglises', label: 'Églises', icon: Church },
  { id: 'traitements', label: 'Traitements', icon: ClipboardList },
  { id: 'mouvements', label: 'Mouvements de caisse', icon: ArrowLeftRight },
  { id: 'rapports', label: 'Rapports', icon: BarChart3 },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
  { id: 'apropos', label: 'À propos', icon: Info },
]

export default function Sidebar({ page, onNavigate, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg viewBox="0 0 120 90" width="104" height="78" aria-hidden="true">
          <path d="M14 78 A46 46 0 0 1 106 78" fill="none" stroke="#F5B73B" strokeWidth="3" />
          <rect x="52" y="6" width="3" height="14" fill="#fff" />
          <rect x="47" y="11" width="13" height="3" fill="#fff" />
          <path d="M40 78 V42 L53.5 28 L67 42 V78 Z" fill="#fff" />
          <path d="M20 78 V56 L40 48 V78 Z" fill="#DCE7FF" />
          <path d="M67 48 L87 56 V78 H67 Z" fill="#DCE7FF" />
          <path d="M49 78 V60 a4.5 4.5 0 0 1 9 0 V78 Z" fill="#1D4ED8" />
          <path d="M4 80 Q60 70 116 80" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <h1>Église Unie</h1>
        <p>Gérer · Suivre · Partager</p>
      </div>

      <nav>
        {MENU.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => onNavigate(id)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="user">
          <div className="avatar"><User size={22} /></div>
          <div>
            <strong>{user?.username}</strong>
            <small>{user?.role}</small>
          </div>
        </div>
        <button className="logout" onClick={onLogout}>
          <LogOut size={18} /> Se déconnecter
        </button>
      </div>
    </aside>
  )
}
