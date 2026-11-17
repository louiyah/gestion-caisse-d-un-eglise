import { useState } from 'react'
import { Church, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, ar } from '../api'
import { Modal, Pagination, Vide, usePagination } from './ui'

export default function EglisesPanel({ eglises, onChange, notify }) {
  const [modal, setModal] = useState(null) // {mode: 'nouvelle'|'modifier'|'voir', eglise?}
  const [nom, setNom] = useState('')
  const [mouvements, setMouvements] = useState([])
  const p = usePagination(eglises, 5)

  const ouvrir = async (mode, eglise) => {
    setNom(eglise?.design ?? '')
    setModal({ mode, eglise })
    if (mode === 'voir') setMouvements(await api.mouvements({ ideglise: eglise.ideglise }))
  }

  const enregistrer = async (e) => {
    e.preventDefault()
    try {
      if (modal.mode === 'nouvelle') await api.creerEglise({ design: nom })
      else await api.modifierEglise(modal.eglise.ideglise, { design: nom })
      notify('Église enregistrée')
      setModal(null)
      onChange()
    } catch (err) { notify(err.message, true) }
  }

  const supprimer = async (eglise) => {
    if (!window.confirm(`Supprimer « ${eglise.design} » et tous ses mouvements ?`)) return
    try { await api.supprimerEglise(eglise.ideglise); notify('Église supprimée'); onChange() }
    catch (err) { notify(err.message, true) }
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h2><Church size={20} /> Liste des Églises</h2>
        <button className="btn primary" onClick={() => ouvrir('nouvelle')}><Plus size={16} /> Nouvelle Église</button>
      </header>
      <table>
        <thead><tr><th>#</th><th>Église</th><th>Solde</th><th>Montant Total</th><th className="c">Actions</th></tr></thead>
        <tbody>
          {p.visibles.map((e, i) => (
            <tr key={e.ideglise}>
              <td>{p.debut + i + 1}</td>
              <td>{e.design}</td>
              <td>{ar(e.solde)}</td>
              <td>{ar(e.total_entrees)}</td>
              <td className="actions">
                <button className="icon-btn blue" title="Voir" onClick={() => ouvrir('voir', e)}><Eye size={14} /></button>
                <button className="icon-btn blue" title="Modifier" onClick={() => ouvrir('modifier', e)}><Pencil size={14} /></button>
                <button className="icon-btn red" title="Supprimer" onClick={() => supprimer(e)}><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {eglises.length === 0 && <Vide>Aucune église. Cliquez sur « Nouvelle Église » pour commencer.</Vide>}
      <Pagination p={p} />

      {modal && modal.mode !== 'voir' && (
        <Modal titre={modal.mode === 'nouvelle' ? 'Nouvelle église' : "Modifier l'église"} onClose={() => setModal(null)}>
          <form onSubmit={enregistrer} className="form">
            <label>Nom de l'église (Design) *
              <input autoFocus required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Église Unie Centrale" />
            </label>
            {modal.mode === 'nouvelle' && <p className="hint">Le solde initial d'une nouvelle église est de 0 Ar.</p>}
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.mode === 'voir' && (
        <Modal titre={modal.eglise.design} onClose={() => setModal(null)} large>
          <div className="detail-cards">
            <div><span>Solde actuel</span><strong>{ar(modal.eglise.solde)}</strong></div>
            <div><span>Total des entrées</span><strong>{ar(modal.eglise.total_entrees)}</strong></div>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Motif</th><th>Montant</th><th>Type</th></tr></thead>
            <tbody>
              {mouvements.map((m) => (
                <tr key={`${m.type}${m.id}`}>
                  <td>{m.date.split('-').reverse().join('/')}</td><td>{m.motif}</td><td>{ar(m.montant)}</td>
                  <td><span className={`badge ${m.type === 'Entrée' ? 'in' : 'out'}`}>{m.type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {mouvements.length === 0 && <Vide>Aucun mouvement pour cette église.</Vide>}
        </Modal>
      )}
    </section>
  )
}
