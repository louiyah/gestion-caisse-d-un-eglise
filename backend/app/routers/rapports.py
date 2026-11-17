from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import reports, services
from ..database import SEUIL_MINIMAL, get_db
from ..models import Eglise, Entree, Sortie

router = APIRouter(prefix="/api", tags=["Rapports"])


@router.get("/stats")
def stats(debut: date | None = None, fin: date | None = None, ideglise: int | None = None,
          db: Session = Depends(get_db)):
    """Cartes du tableau de bord : total entrant, total sortant, solde, période."""
    total_in, total_out = services.totaux(db, debut, fin, ideglise)
    if ideglise:
        solde = services.get_eglise_or_404(db, ideglise).solde
    else:
        solde = db.scalar(select(func.coalesce(func.sum(Eglise.solde), 0))) or 0
    return {"total_entrant": total_in, "total_sortant": total_out,
            "solde_actuel": solde, "seuil_minimal": SEUIL_MINIMAL}


def _split(db, debut, fin, ideglise):
    lignes = services.mouvements(db, debut, fin, ideglise)
    return ([l for l in lignes if l["type"] == "Entrée"][::-1],
            [l for l in lignes if l["type"] == "Sortie"][::-1])


@router.get("/rapports/pdf")
def rapport_pdf(debut: date = Query(...), fin: date = Query(...), ideglise: int | None = None,
                db: Session = Depends(get_db)):
    entrees, sorties = _split(db, debut, fin, ideglise)
    nom = db.get(Eglise, ideglise).design if ideglise else None
    pdf = reports.generer_pdf(entrees, sorties, debut, fin, nom)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="mouvement_{debut}_{fin}.pdf"'})


@router.get("/rapports/excel")
def rapport_excel(debut: date = Query(...), fin: date = Query(...), ideglise: int | None = None,
                  db: Session = Depends(get_db)):
    entrees, sorties = _split(db, debut, fin, ideglise)
    data = reports.generer_excel(entrees, sorties, debut, fin)
    return Response(
        data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="mouvement_{debut}_{fin}.xlsx"'},
    )


@router.get("/rapports/histogramme-data")
def histogramme_data(debut: date | None = None, fin: date | None = None,
                     db: Session = Depends(get_db)):
    """Données de l'histogramme : total entrées / sorties par église."""
    out = []
    for e in db.scalars(select(Eglise).order_by(Eglise.ideglise)).all():
        t_in, t_out = services.totaux(db, debut, fin, e.ideglise)
        out.append({"eglise": e.design, "entrees": t_in, "sorties": t_out})
    return out


@router.get("/rapports/histogramme.png")
def histogramme_png(debut: date | None = None, fin: date | None = None,
                    db: Session = Depends(get_db)):
    data = histogramme_data(debut, fin, db)
    titre = "Entrées / Sorties par église"
    if debut and fin:
        titre += f" ({reports.fd(debut)} → {reports.fd(fin)})"
    png = reports.histogramme([d["eglise"] for d in data], [d["entrees"] for d in data],
                              [d["sorties"] for d in data], titre)
    return Response(png, media_type="image/png")
