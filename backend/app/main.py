from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (enregistre les tables)
from .database import Base, SessionLocal, engine
from .routers import auth, eglises, mouvements, rapports
from .security import creer_admin_par_defaut, utilisateur_courant


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Les tables sont créées par l'ORM au premier lancement (choix du projet).
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        creer_admin_par_defaut(db)
    yield


app = FastAPI(title="Gestion de caisse d'une église", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # app desktop locale : l'API n'écoute que sur 127.0.0.1
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
protege = [Depends(utilisateur_courant)]
app.include_router(eglises.router, dependencies=protege)
app.include_router(mouvements.router, dependencies=protege)
app.include_router(rapports.router, dependencies=protege)


@app.get("/api/health")
def health():
    return {"status": "ok"}
