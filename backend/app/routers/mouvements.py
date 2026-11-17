from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..models import Entree, Sortie
from ..schemas import EntreeIn, EntreeOut, Mouvement, SortieIn, SortieOut

router = APIRouter(prefix="/api", tags=["Entrées / Sorties"])


# ---------- ENTREE ----------
@router.get("/entrees", response_model=list[EntreeOut])
def lister_entrees(
    debut: date | None = None,
    fin: date | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Entree).order_by(Entree.dateentre.desc(), Entree.identre.desc())
    if debut:
        stmt = stmt.where(Entree.dateentre >= debut)
    if fin:
        stmt = stmt.where(Entree.dateentre <= fin)
    if q:
        stmt = stmt.where(Entree.motif.like(f"%{q}%"))
    return db.scalars(stmt).all()


@router.post("/entrees", response_model=EntreeOut, status_code=201)
def creer_entree(data: EntreeIn, db: Session = Depends(get_db)):
    return services.creer_entree(db, data)


@router.put("/entrees/{identre}", response_model=EntreeOut)
def modifier_entree(identre: int, data: EntreeIn, db: Session = Depends(get_db)):
    return services.modifier_entree(db, identre, data)


@router.delete("/entrees/{identre}", status_code=204)
def supprimer_entree(identre: int, db: Session = Depends(get_db)):
    services.supprimer_entree(db, identre)


# ---------- SORTIE ----------
@router.get("/sorties", response_model=list[SortieOut])
def lister_sorties(
    debut: date | None = None,
    fin: date | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Sortie).order_by(Sortie.datesortie.desc(), Sortie.idsortie.desc())
    if debut:
        stmt = stmt.where(Sortie.datesortie >= debut)
    if fin:
        stmt = stmt.where(Sortie.datesortie <= fin)
    if q:
        stmt = stmt.where(Sortie.motif.like(f"%{q}%"))
    return db.scalars(stmt).all()


@router.post("/sorties", response_model=SortieOut, status_code=201)
def creer_sortie(data: SortieIn, db: Session = Depends(get_db)):
    return services.creer_sortie(db, data)


@router.put("/sorties/{idsortie}", response_model=SortieOut)
def modifier_sortie(idsortie: int, data: SortieIn, db: Session = Depends(get_db)):
    return services.modifier_sortie(db, idsortie, data)


@router.delete("/sorties/{idsortie}", status_code=204)
def supprimer_sortie(idsortie: int, db: Session = Depends(get_db)):
    services.supprimer_sortie(db, idsortie)


# ---------- Mouvements unifiés (recherche LIKE + entre deux dates) ----------
@router.get("/mouvements", response_model=list[Mouvement])
def lister_mouvements(
    debut: date | None = None,
    fin: date | None = None,
    ideglise: int | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    return services.mouvements(db, debut, fin, ideglise, q)
