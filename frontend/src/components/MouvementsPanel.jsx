import { useEffect, useState } from 'react'
import { ArrowLeftRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api, dateFr, nombre } from '../api'
import { aujourdhui } from './EntreeForm'
import { Modal, Pagination, Vide, usePagination } from './ui'

function MouvementForm({ eglises, initial, onSaved, onCancel, notify }) {
  const [f, setF] = useState({
    type: initial?.type ?? 'Entrée',
    ideglise: initial?.ideglise ?? eglises[0]?.ideglise ?? '',
    motif: initial?.motif ?? '',
    montant: initial?.montant ?? '',
    date: initial?.date ?? aujourdhui(),
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const edition = !!initial

  const submit = async (e) => {
    e.preventDefault()
    const base = { ideglise: Number(f.ideglise), motif: f.motif }
    try {
      if (f.type === 'Entrée') {
        const d = { ...base, montantentre: Number(f.montant), dateentre: f.date,
                    type_traitement: initial?.type_traitement ?? null, commentaire: initial?.commentaire ?? null }
        edition ? await api.modifierEntree(initial.id, d) : await api.creerEntree(d)
      } else {
        const d = { ...base, montantsortie: Number(f.montant), datesortie: f.date, commentaire: initial?.commentaire ?? null }
        edition ? await api.modifierSortie(initial.id, d) : await api.creerSortie(d)
      }
      notify('Mouvement enregistré')
      onSaved()
    } catch (err) { notify(err.message, true) }
  }

  return (
    <form className="form grid2" onSubmit={submit}>
      <label>Type *
        <select value={f.type} onChange={set('type')} disabled={edition}>
          <option>Entrée</option><option>Sortie</option>
        </select>
      </label>
      <label>Église *
        <select required value={f.ideglise} onChange={set('ideglise')}>
          {eglises.map((e) => <option key={e.ideglise} value={e.ideglise}>{e.design}</option>)}
        </select>
      </label>
      <label className="span2">Motif *
        <input required value={f.motif} onChange={set('motif')} placeholder={f.type === 'Entrée' ? 'Ex. Rakitra' : 'Ex. Achat d\'un micro'} />
      </label>
      <label>Montant (Ar) *
        <input required type="number" min="1" value={f.montant} onChange={set('montant')} />
      </label>
      <label>Date *
        <input required type="date" value={f.date} onChange={set('date')} />
      </label>
      {f.type === 'Sortie' && <p className="hint span2">Le solde de l'église ne doit jamais descendre sous 10.000 Ar.</p>}
      <div className="form-actions span2">
        <button type="button" className="btn" onClick={onCancel}>Annuler</button>
        <button className="btn primary">Enregistrer</button>
      </div>
    </form>
  )
}

export default function MouvementsPanel({ eglises, periode, version, onChange, notify }) {
  const [lignes, setLignes] = useState([])
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // 'nouveau' | mouvement à éditer
  const p = usePagination(lignes, 5)

  // Recherche par motif (LIKE côté serveur) + période
  useEffect(() => {
    const t = setTimeout(() => {
      api.mouvements({ debut: periode.debut, fin: periode.fin, q }).then(setLignes).catch((e) => notify(e.message, true))
    }, 200)
    return () => clearTimeout(t)
  }, [q, periode.debut, periode.fin, version])

  const supprimer = async (m) => {
    if (!window.confirm(`Supprimer ce mouvement (${m.type.toLowerCase()} de ${nombre(m.montant)} Ar) ?`)) return
    try {
      m.type === 'Entrée' ? await api.supprimerEntree(m.id) : await api.supprimerSortie(m.id)
      notify('Mouvement supprimé')
      onChange()
    } catch (err) { notify(err.message, true) }
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h2><ArrowLeftRight size={20} /> Mouvements de Caisse</h2>
        <div className="head-tools">
          <div className="search"><Search size={14} />
            <input placeholder="Rechercher un motif…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn primary small" onClick={() => setModal('nouveau')} disabled={eglises.length === 0}>
            <Plus size={14} /> Mouvement
          </button>
        </div>
      </header>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Motif</th><th>Montant (Ar)</th><th>Type</th><th className="c">Actions</th></tr></thead>
        <tbody>
          {p.visibles.map((m, i) => (
            <tr key={`${m.type}${m.id}`}>
              <td>{p.debut + i + 1}</td>
              <td>{dateFr(m.date)}</td>
              <td>{m.motif}</td>
              <td>{nombre(m.montant)}</td>
              <td><span className={`badge ${m.type === 'Entrée' ? 'in' : 'out'}`}>{m.type}</span></td>
              <td className="actions">
                <button className="icon-btn blue" title="Modifier" onClick={() => setModal(m)}><Pencil size={14} /></button>
                <button className="icon-btn red" title="Supprimer" onClick={() => supprimer(m)}><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lignes.length === 0 && <Vide>Aucun mouvement trouvé.</Vide>}
      <Pagination p={p} />

      {modal && (
        <Modal titre={modal === 'nouveau' ? 'Nouveau mouvement' : 'Modifier le mouvement'} onClose={() => setModal(null)} large>
          <MouvementForm eglises={eglises} notify={notify}
            initial={modal === 'nouveau' ? null : modal}
            onSaved={() => { setModal(null); onChange() }} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </section>
  )
}
