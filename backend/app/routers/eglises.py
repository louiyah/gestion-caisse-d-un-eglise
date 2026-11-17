from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Eglise, Entree
from ..schemas import EgliseIn, EgliseOut
from ..services import get_eglise_or_404

router = APIRouter(prefix="/api/eglises", tags=["Églises"])


def _to_out(db: Session, e: Eglise) -> EgliseOut:
    total = db.scalar(
        select(func.coalesce(func.sum(Entree.montantentre), 0)).where(Entree.ideglise == e.ideglise)
    )
    return EgliseOut(ideglise=e.ideglise, design=e.design, solde=e.solde, total_entrees=total or 0)


@router.get("", response_model=list[EgliseOut])
def lister(db: Session = Depends(get_db)):
    eglises = db.scalars(select(Eglise).order_by(Eglise.ideglise)).all()
    return [_to_out(db, e) for e in eglises]


@router.post("", response_model=EgliseOut, status_code=201)
def creer(data: EgliseIn, db: Session = Depends(get_db)):
    eglise = Eglise(design=data.design.strip(), solde=0)  # solde initial = 0
    db.add(eglise)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Une église portant ce nom existe déjà")
    db.refresh(eglise)
    return _to_out(db, eglise)


@router.put("/{ideglise}", response_model=EgliseOut)
def modifier(ideglise: int, data: EgliseIn, db: Session = Depends(get_db)):
    eglise = get_eglise_or_404(db, ideglise)
    eglise.design = data.design.strip()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Une église portant ce nom existe déjà")
    return _to_out(db, eglise)


@router.delete("/{ideglise}", status_code=204)
def supprimer(ideglise: int, db: Session = Depends(get_db)):
    eglise = get_eglise_or_404(db, ideglise)
    db.delete(eglise)
    db.commit()
