import { useEffect, useState } from 'react'
import { Eye, FileText, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { api, ar, dateFr } from '../api'
import EntreeForm from './EntreeForm'
import { Modal, Pagination, Vide, usePagination } from './ui'

/** Colonne droite haute : formulaire « Nouveau Traitement » avec onglets Création / Liste / Rapports. */
export function NouveauTraitement({ eglises, traitements, periode, onChange, notify }) {
  const [onglet, setOnglet] = useState('Création')
  const [cle, setCle] = useState(0)
  const recents = traitements.slice(0, 6)
  return (
    <section className="panel">
      <header className="panel-head"><h2><FileText size={20} /> Nouveau Traitement</h2></header>
      <div className="tabs">
        {['Création', 'Liste', 'Rapports'].map((t) => (
          <button key={t} className={onglet === t ? 'active' : ''} onClick={() => setOnglet(t)}>{t}</button>
        ))}
      </div>
      {onglet === 'Création' && (
        <EntreeForm key={cle} eglises={eglises} notify={notify}
          onSaved={onChange} onCancel={() => setCle(cle + 1)} />
      )}
      {onglet === 'Liste' && (
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Montant</th></tr></thead>
          <tbody>
            {recents.map((t) => (
              <tr key={t.identre}><td>{dateFr(t.dateentre)}</td><td>{t.type_traitement ?? t.motif}</td><td>{ar(t.montantentre)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {onglet === 'Liste' && recents.length === 0 && <Vide>Aucun traitement enregistré.</Vide>}
      {onglet === 'Rapports' && (
        <img className="histo" alt="Histogramme entrées / sorties par église"
          src={api.histogrammeUrl({ debut: periode.debut, fin: periode.fin, t: Date.now() })} />
      )}
    </section>
  )
}

/** Colonne gauche basse : « Liste des Traitements » (= entrées), filtrable par période. */
export function ListeTraitements({ eglises, traitements, periode, onChange, notify }) {
  const [filtre, setFiltre] = useState({ debut: '', fin: '' })
  const [voir, setVoir] = useState(null)
  const [edit, setEdit] = useState(null)
  const [ouvert, setOuvert] = useState(false)

  useEffect(() => { setFiltre({ debut: periode.debut, fin: periode.fin }) }, [periode.debut, periode.fin])

  const lignes = traitements.filter(
    (t) => (!filtre.debut || t.dateentre >= filtre.debut) && (!filtre.fin || t.dateentre <= filtre.fin)
  )
  const p = usePagination(lignes, 5)

  const supprimer = async (t) => {
    if (!window.confirm('Supprimer ce traitement ? Le solde de l\'église sera réajusté.')) return
    try { await api.supprimerEntree(t.identre); notify('Traitement supprimé'); onChange() }
    catch (err) { notify(err.message, true) }
  }
  const nomEglise = (id) => eglises.find((e) => e.ideglise === id)?.design ?? ''

  return (
    <section className="panel">
      <header className="panel-head">
        <h2><RefreshCw size={20} /> Liste des Traitements</h2>
        <div className="filtre">
          <button className="btn small" onClick={() => setOuvert(!ouvert)}>Filtrer par période ▾</button>
          {ouvert && (
            <div className="popover">
              <label>Du <input type="date" value={filtre.debut} onChange={(e) => setFiltre({ ...filtre, debut: e.target.value })} /></label>
              <label>Au <input type="date" value={filtre.fin} onChange={(e) => setFiltre({ ...filtre, fin: e.target.value })} /></label>
              <button className="link" onClick={() => setFiltre({ debut: '', fin: '' })}>Réinitialiser</button>
            </div>
          )}
        </div>
      </header>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Montant (Ar)</th><th>Commentaire</th><th className="c">Actions</th></tr></thead>
        <tbody>
          {p.visibles.map((t, i) => (
            <tr key={t.identre}>
              <td>{p.debut + i + 1}</td>
              <td>{dateFr(t.dateentre)}</td>
              <td>{t.type_traitement ?? t.motif}</td>
              <td>{ar(t.montantentre)}</td>
              <td>{t.commentaire}</td>
              <td className="actions">
                <button className="icon-btn blue" title="Voir" onClick={() => setVoir(t)}><Eye size={14} /></button>
                <button className="icon-btn indigo" title="Modifier" onClick={() => setEdit(t)}><Pencil size={14} /></button>
                <button className="icon-btn red" title="Supprimer" onClick={() => supprimer(t)}><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lignes.length === 0 && <Vide>Aucun traitement sur cette période.</Vide>}
      <Pagination p={p} />

      {voir && (
        <Modal titre="Détail du traitement" onClose={() => setVoir(null)}>
          <dl className="dl">
            <dt>Église</dt><dd>{nomEglise(voir.ideglise)}</dd>
            <dt>Type</dt><dd>{voir.type_traitement ?? voir.motif}</dd>
            <dt>Montant</dt><dd>{ar(voir.montantentre)}</dd>
            <dt>Date</dt><dd>{dateFr(voir.dateentre)}</dd>
            <dt>Commentaire</dt><dd>{voir.commentaire || '—'}</dd>
          </dl>
        </Modal>
      )}
      {edit && (
        <Modal titre="Modifier le traitement" onClose={() => setEdit(null)} large>
          <EntreeForm eglises={eglises} notify={notify}
            initial={{ id: edit.identre, ideglise: edit.ideglise, montant: edit.montantentre,
                       type_traitement: edit.type_traitement ?? edit.motif, date: edit.dateentre,
                       commentaire: edit.commentaire ?? '' }}
            onSaved={() => { setEdit(null); onChange() }} onCancel={() => setEdit(null)} />
        </Modal>
      )}
    </section>
  )
}
