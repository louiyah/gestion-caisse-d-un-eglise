import { BarChart3, CalendarDays, Church, TrendingUp, Wallet } from 'lucide-react'
import { ar, dateFr } from '../api'

export default function StatCards({ stats, periode, onPeriode }) {
  const s = stats ?? { total_entrant: 0, total_sortant: 0, solde_actuel: 0 }
  const libelle =
    periode.debut && periode.fin
      ? `Du ${dateFr(periode.debut)} au ${dateFr(periode.fin)}`
      : 'Toutes les périodes'
  return (
    <section className="stats">
      <div className="stat blue">
        <div className="stat-icon"><Church size={34} /></div>
        <div>
          <span>Total Montant Entrant</span>
          <strong>{ar(s.total_entrant)}</strong>
        </div>
        <em className="trend up"><TrendingUp size={13} /> +0%</em>
      </div>
      <div className="stat green">
        <div className="stat-icon"><Wallet size={34} /></div>
        <div>
          <span>Total Montant Sortant</span>
          <strong>{ar(s.total_sortant)}</strong>
        </div>
        <em className="trend down"><TrendingUp size={13} /> +0%</em>
      </div>
      <div className="stat purple">
        <div className="stat-icon"><BarChart3 size={34} /></div>
        <div>
          <span>Solde Actuel</span>
          <strong>{ar(s.solde_actuel)}</strong>
        </div>
      </div>
      <div className="stat cyan">
        <div className="stat-icon"><CalendarDays size={34} /></div>
        <div className="periode">
          <span>Période</span>
          <b>{libelle}</b>
          <div className="periode-inputs">
            <input type="date" value={periode.debut} onChange={(e) => onPeriode({ ...periode, debut: e.target.value })} />
            <input type="date" value={periode.fin} onChange={(e) => onPeriode({ ...periode, fin: e.target.value })} />
            {(periode.debut || periode.fin) && (
              <button className="link" onClick={() => onPeriode({ debut: '', fin: '' })}>Tout</button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
