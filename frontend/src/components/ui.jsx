import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export function Modal({ titre, onClose, children, large }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${large ? 'modal-lg' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{titre}</h3>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/** Pagination « Affichage de 1 à 3 sur 3 entrées » comme dans la maquette. */
export function usePagination(items, taille = 5) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / taille))
  useEffect(() => { if (page > pages) setPage(pages) }, [pages, page])
  const debut = (page - 1) * taille
  return { page, setPage, pages, visibles: items.slice(debut, debut + taille), debut, total: items.length }
}

export function Pagination({ p }) {
  const fin = Math.min(p.debut + 5, p.total)
  return (
    <div className="pagination">
      <span>Affichage de {p.total === 0 ? 0 : p.debut + 1} à {fin} sur {p.total} entrées</span>
      <div className="pages">
        <button disabled={p.page === 1} onClick={() => p.setPage(p.page - 1)}><ChevronLeft size={14} /></button>
        {Array.from({ length: p.pages }, (_, i) => (
          <button key={i} className={p.page === i + 1 ? 'active' : ''} onClick={() => p.setPage(i + 1)}>{i + 1}</button>
        ))}
        <button disabled={p.page === p.pages} onClick={() => p.setPage(p.page + 1)}><ChevronRight size={14} /></button>
      </div>
    </div>
  )
}

export function Vide({ children }) {
  return <div className="vide">{children}</div>
}
