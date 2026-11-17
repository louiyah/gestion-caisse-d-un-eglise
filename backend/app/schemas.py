from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class EgliseIn(BaseModel):
    design: str = Field(min_length=1, max_length=150)


class EgliseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ideglise: int
    design: str
    solde: int
    total_entrees: int = 0


class EntreeIn(BaseModel):
    ideglise: int
    motif: str = Field(min_length=1, max_length=200)
    montantentre: int = Field(gt=0)
    dateentre: date
    type_traitement: str | None = None
    commentaire: str | None = None


class EntreeOut(EntreeIn):
    model_config = ConfigDict(from_attributes=True)
    identre: int


class SortieIn(BaseModel):
    ideglise: int
    motif: str = Field(min_length=1, max_length=200)
    montantsortie: int = Field(gt=0)
    datesortie: date
    commentaire: str | None = None


class SortieOut(SortieIn):
    model_config = ConfigDict(from_attributes=True)
    idsortie: int


class Mouvement(BaseModel):
    """Ligne unifiée Entrée/Sortie pour le tableau « Mouvements de caisse »."""
    id: int
    ideglise: int
    eglise: str
    date: date
    motif: str
    montant: int
    type: str  # "Entrée" | "Sortie"
    type_traitement: str | None = None
    commentaire: str | None = None
