import { useState } from 'react'
import { BarChart3, FileSpreadsheet, FileText, Play, Printer } from 'lucide-react'
import { api, ar, dateFr, nombre, telecharger } from '../api'
import { Vide } from './ui'

export default function RapportsPanel({ periode, eglises, complet }) {
  const [debut, setDebut] = useState(periode.debut || `${new Date().getFullYear()}-01-01`)
  const [fin, setFin] = useState(periode.fin || new Date().toISOString().slice(0, 10))
  const [ideglise, setIdeglise] = useState('')
  const [rapport, setRapport] = useState(null)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  const params = { debut, fin, ideglise }
  const valide = debut && fin && debut <= fin

  const generer = async () => {
    setErreur('')
    if (!valide) return setErreur('La date de début doit précéder la date de fin.')
    try {
      const [mouvements, histo] = await Promise.all([api.mouvements(params), api.histogramme({ debut, fin })])
      setRapport({
        entrees: mouvements.filter((m) => m.type === 'Entrée'),
        sorties: mouvements.filter((m) => m.type === 'Sortie'),
        histo, debut, fin, t: Date.now(),
      })
    } catch (e) { setErreur(e.message) }
  }

  const exporter = async (type, ext) => {
    if (!valide) return setErreur('Choisissez une période valide.')
    setOccupe(true)
    try { await telecharger(api.rapportUrl(type, params), `mouvement_caisse_${debut}_${fin}.${ext}`) }
    catch (e) { setErreur(e.message) }
    setOccupe(false)
  }

  const totalIn = rapport?.entrees.reduce((s, m) => s + m.montant, 0) ?? 0
  const totalOut = rapport?.sorties.reduce((s, m) => s + m.montant, 0) ?? 0

  return (
    <section className="panel rapports">
      <header className="panel-head">
        <h2><BarChart3 size={20} /> Rapports et Export</h2>
      </header>
      <div className="rapport-bar">
        <label>Période du rapport :
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
          <span>→</span>
          <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        </label>
        <select value={ideglise} onChange={(e) => setIdeglise(e.target.value)} title="Église">
          <option value="">Toutes les églises</option>
          {eglises.map((e) => <option key={e.ideglise} value={e.ideglise}>{e.design}</option>)}
        </select>
        <button className="btn primary" onClick={generer}><Play size={14} /> Générer le rapport</button>
        <span className="spacer" />
        <button className="btn green" disabled={occupe} onClick={() => exporter('pdf', 'pdf')}><FileText size={15} /> Exporter PDF</button>
        <button className="btn green" disabled={occupe} onClick={() => exporter('excel', 'xlsx')}><FileSpreadsheet size={15} /> Exporter Excel</button>
        <button className="btn" onClick={() => window.print()}><Printer size={15} /> Imprimer</button>
      </div>
      {erreur && <p className="erreur">{erreur}</p>}

      {rapport && (
        <div className="rapport-resultat">
          <h4>Mouvement de caisse entre le {dateFr(rapport.debut)} et le {dateFr(rapport.fin)}</h4>
          <div className="rapport-cols">
            <div>
              <h5>Mouvement d'entrée en caisse</h5>
              <table><thead><tr><th>Date d'entrée</th><th>Motif</th><th>Montant</th></tr></thead>
                <tbody>{rapport.entrees.map((m) => <tr key={m.id}><td>{dateFr(m.date)}</td><td>{m.motif}</td><td>{ar(m.montant)}</td></tr>)}</tbody></table>
              <p className="total">Total Montant entrant : <b>{ar(totalIn)}</b></p>
            </div>
            <div>
              <h5>Mouvement de sortie de caisse</h5>
              <table><thead><tr><th>Date de sortie</th><th>Motif</th><th>Montant</th></tr></thead>
                <tbody>{rapport.sorties.map((m) => <tr key={m.id}><td>{dateFr(m.date)}</td><td>{m.motif}</td><td>{ar(m.montant)}</td></tr>)}</tbody></table>
              <p className="total">Total Montant sortant : <b>{ar(totalOut)}</b></p>
            </div>
          </div>
          {complet && (
            <>
              <h5>Histogramme : entrées / sorties par église</h5>
              <img className="histo" alt="Histogramme" src={api.histogrammeUrl({ debut: rapport.debut, fin: rapport.fin, t: rapport.t })} />
              <p className="hint">Soit {nombre(totalIn - totalOut)} Ar de solde sur la période.</p>
            </>
          )}
        </div>
      )}
      {!rapport && complet && <Vide>Choisissez une période puis cliquez sur « Générer le rapport ».</Vide>}
    </section>
  )
}
