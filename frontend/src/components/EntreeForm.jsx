import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { api } from '../api'

export const TYPES_TRAITEMENT = [
  "Don d'une association",
  "Don d'un membre",
  'Offrande dominicale',
  'Rakitra',
  'Dîme',
  'Autre',
]

export const aujourdhui = () => new Date().toISOString().slice(0, 10)

/**
 * Formulaire « Nouveau Traitement » de la maquette.
 * Un traitement = une ENTREE : il crée la ligne et additionne le montant au solde de l'église.
 */
export default function EntreeForm({ eglises, initial, onSaved, onCancel, notify }) {
  const [f, setF] = useState({
    ideglise: initial?.ideglise ?? eglises[0]?.ideglise ?? '',
    montant: initial?.montant ?? '',
    type_traitement: initial?.type_traitement ?? TYPES_TRAITEMENT[0],
    date: initial?.date ?? aujourdhui(),
    commentaire: initial?.commentaire ?? '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const data = {
      ideglise: Number(f.ideglise),
      motif: f.type_traitement,
      montantentre: Number(f.montant),
      dateentre: f.date,
      type_traitement: f.type_traitement,
      commentaire: f.commentaire || null,
    }
    try {
      if (initial?.id) await api.modifierEntree(initial.id, data)
      else await api.creerEntree(data)
      notify('Traitement enregistré')
      if (!initial?.id) setF({ ...f, montant: '', commentaire: '' })
      onSaved()
    } catch (err) { notify(err.message, true) }
  }

  return (
    <form className="form grid2" onSubmit={submit}>
      <label>Église *
        <select required value={f.ideglise} onChange={set('ideglise')}>
          {eglises.map((e) => <option key={e.ideglise} value={e.ideglise}>{e.design}</option>)}
        </select>
      </label>
      <label>Montant (Ar) *
        <input required type="number" min="1" step="1" value={f.montant} onChange={set('montant')} placeholder="200000" />
      </label>
      <label>Type de traitement *
        <select value={f.type_traitement} onChange={set('type_traitement')}>
          {TYPES_TRAITEMENT.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label>Date d'entrée *
        <input required type="date" value={f.date} onChange={set('date')} />
      </label>
      <label className="span2">Commentaire (optionnel)
        <textarea rows="2" value={f.commentaire} onChange={set('commentaire')} placeholder="Saisir un commentaire..." />
      </label>
      <div className="form-actions span2">
        <button type="button" className="btn" onClick={onCancel}><X size={15} /> Annuler</button>
        <button className="btn primary" disabled={eglises.length === 0}><Save size={15} /> Enregistrer</button>
      </div>
    </form>
  )
}
