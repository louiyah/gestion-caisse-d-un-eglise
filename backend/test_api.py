"""Smoke test des règles du sujet (SQLite temporaire, pas besoin de Supabase)."""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_caisse.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

with TestClient(app) as c:
    # Authentification : toutes les routes métier exigent un jeton
    assert c.get("/api/eglises").status_code == 401
    assert c.post("/api/auth/login", json={"identifiant": "admin", "mot_de_passe": "faux"}).status_code == 401
    r = c.post("/api/auth/login", json={"identifiant": "ADM001", "mot_de_passe": "admin123", "souvenir": True})
    assert r.status_code == 200, r.text
    jeton = r.json()["token"]
    c.headers["Authorization"] = f"Bearer {jeton}"
    assert c.get("/api/auth/me").json()["username"] == "admin"
    # jeton falsifié refusé ; jeton en paramètre d'URL accepté (images)
    assert TestClient(app).get("/api/eglises", headers={"Authorization": "Bearer x.y"}).status_code == 401
    assert TestClient(app).get("/api/rapports/histogramme.png", params={"token": jeton}).status_code == 200
    # changement de mot de passe
    assert c.post("/api/auth/change-password", json={"ancien": "faux", "nouveau": "nouveau1"}).status_code == 400
    assert c.post("/api/auth/change-password", json={"ancien": "admin123", "nouveau": "nouveau1"}).status_code == 204
    assert TestClient(app).post("/api/auth/login", json={"identifiant": "admin", "mot_de_passe": "nouveau1"}).status_code == 200

    # Création d'églises : solde initial 0
    e1 = c.post("/api/eglises", json={"design": "Église Unie Centrale"}).json()
    e2 = c.post("/api/eglises", json={"design": "Église Saint Matthieu"}).json()
    assert e1["solde"] == 0, e1

    # Doublon refusé
    assert c.post("/api/eglises", json={"design": "Église Unie Centrale"}).status_code == 400

    # Entrées de l'exemple du sujet : 325.000 + 200.000
    r = c.post("/api/entrees", json={"ideglise": e1["ideglise"], "motif": "Rakitra",
                                     "montantentre": 325000, "dateentre": "2023-02-25"})
    assert r.status_code == 201
    r = c.post("/api/entrees", json={"ideglise": e1["ideglise"], "motif": "Don d'une association",
                                     "montantentre": 200000, "dateentre": "2023-03-02",
                                     "type_traitement": "Don d'une association"})
    identre2 = r.json()["identre"]
    assert c.get("/api/eglises").json()[0]["solde"] == 525000

    # Sorties : 28.000 + 151.820
    assert c.post("/api/sorties", json={"ideglise": e1["ideglise"], "motif": "Achat d'un micro",
                                        "montantsortie": 28000, "datesortie": "2023-02-25"}).status_code == 201
    assert c.post("/api/sorties", json={"ideglise": e1["ideglise"], "motif": "Jirama",
                                        "montantsortie": 151820, "datesortie": "2023-03-02"}).status_code == 201
    assert c.get("/api/eglises").json()[0]["solde"] == 525000 - 179820 == 345180

    # Seuil : une sortie qui ferait passer sous 10.000 Ar est refusée
    r = c.post("/api/sorties", json={"ideglise": e1["ideglise"], "motif": "Trop gros",
                                     "montantsortie": 340000, "datesortie": "2023-03-05"})
    assert r.status_code == 400 and "10.000" in r.json()["detail"], r.text
    assert c.get("/api/eglises").json()[0]["solde"] == 345180  # inchangé

    # Sortie sur église à 0 Ar : refusée aussi
    assert c.post("/api/sorties", json={"ideglise": e2["ideglise"], "motif": "x",
                                        "montantsortie": 1, "datesortie": "2023-03-05"}).status_code == 400

    # Recherche LIKE
    assert len(c.get("/api/mouvements", params={"q": "Jira"}).json()) == 1

    # Mouvements entre deux dates + stats = exemple du sujet
    p = {"debut": "2023-02-23", "fin": "2023-03-15"}
    s = c.get("/api/stats", params=p).json()
    assert s["total_entrant"] == 525000 and s["total_sortant"] == 179820, s
    assert len(c.get("/api/mouvements", params=p).json()) == 4

    # Mise à jour d'une entrée : le solde suit
    r = c.put(f"/api/entrees/{identre2}", json={"ideglise": e1["ideglise"], "motif": "Don",
                                                "montantentre": 250000, "dateentre": "2023-03-02"})
    assert r.status_code == 200
    assert c.get("/api/eglises").json()[0]["solde"] == 395180

    # Suppression d'une sortie : l'argent revient
    sorties = c.get("/api/sorties").json()
    c.delete(f"/api/sorties/{sorties[0]['idsortie']}")
    assert c.get("/api/eglises").json()[0]["solde"] > 395180

    # PDF / Excel / histogramme
    pdf = c.get("/api/rapports/pdf", params=p)
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
    xl = c.get("/api/rapports/excel", params=p)
    assert xl.status_code == 200 and xl.content[:2] == b"PK"
    png = c.get("/api/rapports/histogramme.png", params=p)
    assert png.status_code == 200 and png.content[:4] == b"\x89PNG"

print("TOUS LES TESTS OK")
os.remove("test_caisse.db")
