"""Tables du sujet : EGLISE, ENTREE, SORTIE.

Le sujet impose `ideglise`, `design`, `solde` pour EGLISE, et
`identre/idsortie`, `motif`, `montant`, `date` pour ENTREE / SORTIE.
On ajoute `ideglise` en clé étrangère et `type_traitement` / `commentaire`
pour couvrir le formulaire « Nouveau Traitement » de la maquette.
"""
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Eglise(Base):
    __tablename__ = "eglise"

    ideglise: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    design: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    solde: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0 au départ

    entrees: Mapped[list["Entree"]] = relationship(
        back_populates="eglise", cascade="all, delete-orphan"
    )
    sorties: Mapped[list["Sortie"]] = relationship(
        back_populates="eglise", cascade="all, delete-orphan"
    )


class Entree(Base):
    __tablename__ = "entree"

    identre: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ideglise: Mapped[int] = mapped_column(ForeignKey("eglise.ideglise", ondelete="CASCADE"))
    motif: Mapped[str] = mapped_column(String(200), nullable=False)
    montantentre: Mapped[int] = mapped_column(Integer, nullable=False)
    dateentre: Mapped[date] = mapped_column(Date, nullable=False)
    type_traitement: Mapped[str | None] = mapped_column(String(80), nullable=True)
    commentaire: Mapped[str | None] = mapped_column(String(300), nullable=True)

    eglise: Mapped[Eglise] = relationship(back_populates="entrees")


class Sortie(Base):
    __tablename__ = "sortie"

    idsortie: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ideglise: Mapped[int] = mapped_column(ForeignKey("eglise.ideglise", ondelete="CASCADE"))
    motif: Mapped[str] = mapped_column(String(200), nullable=False)
    montantsortie: Mapped[int] = mapped_column(Integer, nullable=False)
    datesortie: Mapped[date] = mapped_column(Date, nullable=False)
    commentaire: Mapped[str | None] = mapped_column(String(300), nullable=True)

    eglise: Mapped[Eglise] = relationship(back_populates="sorties")


class Utilisateur(Base):
    """Compte de connexion (matricule ou nom d'utilisateur + mot de passe haché)."""
    __tablename__ = "utilisateur"

    idutilisateur: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    matricule: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    nom: Mapped[str] = mapped_column(String(120), nullable=False, default="Administrateur")
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="Administrateur")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    actif: Mapped[bool] = mapped_column(default=True)
