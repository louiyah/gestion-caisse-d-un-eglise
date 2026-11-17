# Gestion de caisse d'une église

Application desktop : **Electron + React (Vite)** pour l'interface, **FastAPI + SQLAlchemy** pour le backend, **Supabase PostgreSQL** pour la base.

```
caisse-eglise/
├── backend/     API Python (FastAPI, SQLAlchemy, ReportLab, openpyxl, matplotlib)
└── frontend/    Electron + React ; Electron lance lui-même le backend Python
```

## 1. Base de données Supabase

1. Créez un projet sur supabase.com.
2. *Project Settings → Database → Connection string → URI* : copiez la chaîne (le « Session pooler » fonctionne bien).
3. Dans `backend/`, copiez `.env.example` en `.env` et collez votre chaîne :

```
DATABASE_URL=postgresql+psycopg2://postgres.PROJECT_REF:YOUR_DATABASE_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
SEUIL_MINIMAL=10000
```

Les tables `eglise`, `entree` et `sortie` sont **créées automatiquement par SQLAlchemy** au premier lancement.
Sans `.env`, le backend utilise un fichier SQLite local (`caisse_local.db`) pour pouvoir tester.

## 2. Installation

```bash
# Backend (Python 3.11+)
cd backend
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS : source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## 3. Lancement

```bash
cd frontend
npm run dev      # Vite + Electron, Electron démarre le backend Python tout seul
npm start        # build puis lancement en mode « production »
npm run dist     # installateur Windows (electron-builder)
```

Si Python n'est pas dans le PATH sous le nom `python` / `python3`, définissez la variable `PYTHON`
(ex. `set PYTHON=C:\Python312\python.exe`).

Le backend seul : `cd backend && python run.py` (documentation de l'API : http://127.0.0.1:8000/docs).
Test des règles métier : `cd backend && python test_api.py`.

## 4. Correspondance avec le sujet

| Exigence du sujet | Où |
|---|---|
| Tables EGLISE(ideglise, design, solde), ENTREE, SORTIE | `backend/app/models.py` |
| Solde = 0 initialement, +entrée, −sortie | `services.py` (`creer_entree`, `creer_sortie`) |
| Création et listage d'une église | `routers/eglises.py`, panneau « Liste des Églises » |
| CRUD ENTREE et SORTIE | `routers/mouvements.py`, panneaux Traitements / Mouvements |
| Seuil : solde jamais < 10.000 Ar | `services._verifier_seuil` (`SEUIL_MINIMAL`) |
| Recherche par motif avec LIKE | paramètre `q` → `motif.like('%q%')` |
| Mouvement de caisse entre deux dates | `/api/mouvements?debut=&fin=`, panneau Rapports |
| PDF du mouvement de caisse | `/api/rapports/pdf` (format de l'exemple du sujet) |
| Histogramme | `/api/rapports/histogramme.png` (entrées / sorties par église) |

Un **traitement** de la maquette correspond à une **entrée** : il crée une ligne ENTREE et augmente le solde de l'église.
Un traitement ou une sortie modifié ou supprimé réajuste automatiquement le solde.
