"""Authentification : hachage PBKDF2 (bibliothèque standard) et jeton signé HMAC.

Aucune dépendance supplémentaire. Le jeton contient l'id utilisateur et une date
d'expiration ; il est signé avec une clé secrète (SECRET_KEY du .env, sinon un
fichier `.secret` généré une seule fois à côté du backend).
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path

from fastapi import Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from .database import get_db
from .models import Utilisateur

ITERATIONS = 200_000
DUREE_COURTE = 12 * 3600          # session normale : 12 h
DUREE_LONGUE = 30 * 24 * 3600     # « Se souvenir de moi » : 30 jours


def _secret() -> bytes:
    env = os.getenv("SECRET_KEY")
    if env:
        return env.encode()
    fichier = Path(__file__).resolve().parent.parent / ".secret"
    if not fichier.exists():
        fichier.write_text(secrets.token_hex(32))
    return fichier.read_text().strip().encode()


def hasher(mot_de_passe: str) -> str:
    sel = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", mot_de_passe.encode(), sel, ITERATIONS)
    return f"pbkdf2${ITERATIONS}${sel.hex()}${h.hex()}"


def verifier(mot_de_passe: str, stocke: str) -> bool:
    try:
        _, it, sel, h = stocke.split("$")
        calc = hashlib.pbkdf2_hmac("sha256", mot_de_passe.encode(), bytes.fromhex(sel), int(it))
        return hmac.compare_digest(calc.hex(), h)
    except Exception:
        return False


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def creer_jeton(user_id: int, souvenir: bool) -> tuple[str, int]:
    duree = DUREE_LONGUE if souvenir else DUREE_COURTE
    payload = _b64(json.dumps({"uid": user_id, "exp": int(time.time()) + duree}).encode())
    signature = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{signature}", duree


def lire_jeton(jeton: str) -> int | None:
    try:
        payload, signature = jeton.split(".")
        attendu = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, attendu):
            return None
        data = json.loads(_unb64(payload))
        return data["uid"] if data["exp"] > time.time() else None
    except Exception:
        return None


def utilisateur_courant(
    request: Request,
    token: str | None = Query(default=None),  # pour <img src> (histogramme) qui ne peut pas envoyer d'en-tête
    db: Session = Depends(get_db),
) -> Utilisateur:
    entete = request.headers.get("Authorization", "")
    jeton = entete[7:] if entete.startswith("Bearer ") else token
    uid = lire_jeton(jeton) if jeton else None
    user = db.get(Utilisateur, uid) if uid else None
    if user is None or not user.actif:
        raise HTTPException(401, "Session expirée ou non authentifié")
    return user


def creer_admin_par_defaut(db: Session) -> None:
    """Au premier lancement, crée le compte admin (identifiants modifiables via .env)."""
    if db.query(Utilisateur).first():
        return
    db.add(Utilisateur(
        username=os.getenv("ADMIN_USERNAME", "admin"),
        matricule=os.getenv("ADMIN_MATRICULE", "ADM001"),
        nom="Administrateur",
        role="Administrateur",
        password_hash=hasher(os.getenv("ADMIN_PASSWORD", "admin123")),
    ))
    db.commit()
