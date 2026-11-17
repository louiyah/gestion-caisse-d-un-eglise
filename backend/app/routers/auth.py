import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Utilisateur
from ..security import creer_jeton, hasher, utilisateur_courant, verifier

router = APIRouter(prefix="/api/auth", tags=["Authentification"])

# Anti force brute simple : 5 échecs -> blocage de 60 s pour cet identifiant
_echecs: dict[str, list[float]] = defaultdict(list)
MAX_ECHECS, FENETRE = 5, 60


class LoginIn(BaseModel):
    identifiant: str = Field(min_length=1)
    mot_de_passe: str = Field(min_length=1)
    souvenir: bool = False


class ChangementMdp(BaseModel):
    ancien: str
    nouveau: str = Field(min_length=6)


def _public(u: Utilisateur) -> dict:
    return {"id": u.idutilisateur, "username": u.username, "matricule": u.matricule,
            "nom": u.nom, "role": u.role}


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    cle = data.identifiant.strip().lower()
    maintenant = time.time()
    _echecs[cle] = [t for t in _echecs[cle] if maintenant - t < FENETRE]
    if len(_echecs[cle]) >= MAX_ECHECS:
        raise HTTPException(429, "Trop de tentatives. Réessayez dans une minute.")

    user = db.scalar(select(Utilisateur).where(
        or_(Utilisateur.username == data.identifiant.strip(), Utilisateur.matricule == data.identifiant.strip())))
    if user is None or not user.actif or not verifier(data.mot_de_passe, user.password_hash):
        _echecs[cle].append(maintenant)
        raise HTTPException(401, "Matricule / nom d'utilisateur ou mot de passe incorrect")

    _echecs.pop(cle, None)
    jeton, duree = creer_jeton(user.idutilisateur, data.souvenir)
    return {"token": jeton, "expire_dans": duree, "utilisateur": _public(user)}


@router.get("/me")
def me(user: Utilisateur = Depends(utilisateur_courant)):
    return _public(user)


@router.post("/change-password", status_code=204)
def changer_mot_de_passe(data: ChangementMdp, user: Utilisateur = Depends(utilisateur_courant),
                         db: Session = Depends(get_db)):
    if not verifier(data.ancien, user.password_hash):
        raise HTTPException(400, "Ancien mot de passe incorrect")
    user.password_hash = hasher(data.nouveau)
    db.commit()
