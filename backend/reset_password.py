"""Réinitialise le mot de passe d'un compte (mot de passe oublié).

Usage :  python reset_password.py admin NouveauMotDePasse
"""
import sys

from sqlalchemy import or_, select

from app.database import SessionLocal
from app.models import Utilisateur
from app.security import hasher

if len(sys.argv) != 3:
    sys.exit("Usage : python reset_password.py <matricule ou nom d'utilisateur> <nouveau mot de passe>")

identifiant, nouveau = sys.argv[1], sys.argv[2]
if len(nouveau) < 6:
    sys.exit("Le mot de passe doit contenir au moins 6 caractères.")

with SessionLocal() as db:
    user = db.scalar(select(Utilisateur).where(
        or_(Utilisateur.username == identifiant, Utilisateur.matricule == identifiant)))
    if user is None:
        sys.exit(f"Aucun compte « {identifiant} ».")
    user.password_hash = hasher(nouveau)
    db.commit()
    print(f"Mot de passe de « {user.username} » réinitialisé.")
