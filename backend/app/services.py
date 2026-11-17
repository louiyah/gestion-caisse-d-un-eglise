"""Règles métier de la caisse.

- Solde initial = 0.
- Entrée : solde = solde + montantEntre.
- Sortie : solde = solde - montantSortie, sans jamais passer sous le seuil.
- Modification / suppression : le solde est recalculé en annulant l'ancien
  effet puis en appliquant le nouveau, dans la même transaction.
"""
from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import SEUIL_MINIMAL
from .models import Eglise, Entree, Sortie


def get_eglise_or_404(db: Session, ideglise: int) -> Eglise:
    eglise = db.get(Eglise, ideglise)
    if eglise is None:
        raise HTTPException(404, "Église introuvable")
    return eglise


def _verifier_seuil(eglise: Eglise, nouveau_solde: int) -> None:
    if nouveau_solde < SEUIL_MINIMAL:
        raise HTTPException(
            400,
            f"Opération refusée : le solde de « {eglise.design} » ne peut pas "
            f"être inférieur à {SEUIL_MINIMAL:,} Ar (solde obtenu : {nouveau_solde:,} Ar)."
            .replace(",", "."),
        )


# ---------- Entrées ----------
def creer_entree(db: Session, data) -> Entree:
    eglise = get_eglise_or_404(db, data.ideglise)
    entree = Entree(**data.model_dump())
    eglise.solde += data.montantentre
    db.add(entree)
    db.commit()
    db.refresh(entree)
    return entree


def modifier_entree(db: Session, identre: int, data) -> Entree:
    entree = db.get(Entree, identre)
    if entree is None:
        raise HTTPException(404, "Entrée introuvable")
    ancienne = get_eglise_or_404(db, entree.ideglise)
    nouvelle = get_eglise_or_404(db, data.ideglise)

    # 1) annuler l'ancien effet
    solde_ancienne = ancienne.solde - entree.montantentre
    _verifier_seuil_si_necessaire(ancienne, solde_ancienne)
    ancienne.solde = solde_ancienne
    # 2) appliquer le nouvel effet
    nouvelle.solde += data.montantentre

    for champ, valeur in data.model_dump().items():
        setattr(entree, champ, valeur)
    db.commit()
    db.refresh(entree)
    return entree


def supprimer_entree(db: Session, identre: int) -> None:
    entree = db.get(Entree, identre)
    if entree is None:
        raise HTTPException(404, "Entrée introuvable")
    eglise = get_eglise_or_404(db, entree.ideglise)
    nouveau = eglise.solde - entree.montantentre
    _verifier_seuil_si_necessaire(eglise, nouveau)
    eglise.solde = nouveau
    db.delete(entree)
    db.commit()


def _verifier_seuil_si_necessaire(eglise: Eglise, nouveau_solde: int) -> None:
    """Retirer une entrée diminue le solde : le seuil s'applique aussi."""
    if nouveau_solde < SEUIL_MINIMAL and nouveau_solde < eglise.solde:
        # Une église à 0 Ar (aucune opération) reste autorisée à repasser à 0.
        if nouveau_solde != 0:
            _verifier_seuil(eglise, nouveau_solde)


# ---------- Sorties ----------
def creer_sortie(db: Session, data) -> Sortie:
    eglise = get_eglise_or_404(db, data.ideglise)
    nouveau = eglise.solde - data.montantsortie
    _verifier_seuil(eglise, nouveau)
    sortie = Sortie(**data.model_dump())
    eglise.solde = nouveau
    db.add(sortie)
    db.commit()
    db.refresh(sortie)
    return sortie


def modifier_sortie(db: Session, idsortie: int, data) -> Sortie:
    sortie = db.get(Sortie, idsortie)
    if sortie is None:
        raise HTTPException(404, "Sortie introuvable")
    ancienne = get_eglise_or_404(db, sortie.ideglise)
    nouvelle = get_eglise_or_404(db, data.ideglise)

    # 1) annuler l'ancien effet (rend l'argent)
    ancienne.solde += sortie.montantsortie
    # 2) appliquer le nouvel effet avec contrôle du seuil
    nouveau = nouvelle.solde - data.montantsortie
    try:
        _verifier_seuil(nouvelle, nouveau)
    except HTTPException:
        db.rollback()
        raise
    nouvelle.solde = nouveau

    for champ, valeur in data.model_dump().items():
        setattr(sortie, champ, valeur)
    db.commit()
    db.refresh(sortie)
    return sortie


def supprimer_sortie(db: Session, idsortie: int) -> None:
    sortie = db.get(Sortie, idsortie)
    if sortie is None:
        raise HTTPException(404, "Sortie introuvable")
    eglise = get_eglise_or_404(db, sortie.ideglise)
    eglise.solde += sortie.montantsortie
    db.delete(sortie)
    db.commit()


# ---------- Mouvements / statistiques ----------
def totaux(db: Session, debut: date | None, fin: date | None, ideglise: int | None = None):
    q_in = select(func.coalesce(func.sum(Entree.montantentre), 0))
    q_out = select(func.coalesce(func.sum(Sortie.montantsortie), 0))
    if debut:
        q_in = q_in.where(Entree.dateentre >= debut)
        q_out = q_out.where(Sortie.datesortie >= debut)
    if fin:
        q_in = q_in.where(Entree.dateentre <= fin)
        q_out = q_out.where(Sortie.datesortie <= fin)
    if ideglise:
        q_in = q_in.where(Entree.ideglise == ideglise)
        q_out = q_out.where(Sortie.ideglise == ideglise)
    total_in = db.scalar(q_in) or 0
    total_out = db.scalar(q_out) or 0
    return total_in, total_out


def mouvements(
    db: Session,
    debut: date | None = None,
    fin: date | None = None,
    ideglise: int | None = None,
    recherche: str | None = None,
):
    """Entrées + sorties fusionnées, triées par date décroissante.

    `recherche` utilise LIKE sur le motif (exigence du sujet).
    """
    lignes = []

    q = select(Entree, Eglise.design).join(Eglise, Eglise.ideglise == Entree.ideglise)
    if debut:
        q = q.where(Entree.dateentre >= debut)
    if fin:
        q = q.where(Entree.dateentre <= fin)
    if ideglise:
        q = q.where(Entree.ideglise == ideglise)
    if recherche:
        q = q.where(Entree.motif.like(f"%{recherche}%"))
    for e, nom in db.execute(q):
        lignes.append(dict(id=e.identre, ideglise=e.ideglise, eglise=nom, date=e.dateentre,
                           motif=e.motif, montant=e.montantentre, type="Entrée",
                           type_traitement=e.type_traitement, commentaire=e.commentaire))

    q = select(Sortie, Eglise.design).join(Eglise, Eglise.ideglise == Sortie.ideglise)
    if debut:
        q = q.where(Sortie.datesortie >= debut)
    if fin:
        q = q.where(Sortie.datesortie <= fin)
    if ideglise:
        q = q.where(Sortie.ideglise == ideglise)
    if recherche:
        q = q.where(Sortie.motif.like(f"%{recherche}%"))
    for s, nom in db.execute(q):
        lignes.append(dict(id=s.idsortie, ideglise=s.ideglise, eglise=nom, date=s.datesortie,
                           motif=s.motif, montant=s.montantsortie, type="Sortie",
                           type_traitement=None, commentaire=s.commentaire))

    lignes.sort(key=lambda x: (x["date"], x["id"]), reverse=True)
    return lignes
