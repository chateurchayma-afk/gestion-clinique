from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import core.model_store as store

router = APIRouter()

ALL_FEATURES = [
    "jour_semaine", "mois", "est_weekend", "heure_debut_h", "age",
    "nb_rdv_total", "nb_annulations_passees", "taux_annulation_historique",
    "sexe", "gouvernorat", "methode_contact_preferee", "creneau",
    "specialite_nom", "experience_annees", "prix_vs_moyenne", "taux_annulation_motif",
]

NUM_COLS = [
    "jour_semaine", "mois", "est_weekend", "heure_debut_h", "age",
    "nb_rdv_total", "nb_annulations_passees", "taux_annulation_historique",
    "experience_annees", "prix_vs_moyenne", "taux_annulation_motif",
]

CAT_COLS = ["sexe", "gouvernorat", "methode_contact_preferee", "creneau", "specialite_nom"]


class AnnulationInput(BaseModel):
    jour_semaine: int          # 0=Lundi … 6=Dimanche
    mois: int                  # 1-12
    heure_debut_h: int         # 0-23
    age: int
    nb_rdv_total: int
    nb_annulations_passees: int
    taux_annulation_historique: float
    sexe: str                  # FEMME | HOMME
    gouvernorat: str
    methode_contact_preferee: str  # EMAIL | SMS | TELEPHONE
    specialite_nom: str
    experience_annees: int
    prix_vs_moyenne: float     # (prix médecin - prix moyen spécialité) / prix moyen
    taux_annulation_motif: float   # taux historique annulation pour ce motif (0.0-1.0)


def _creneau(h: int) -> str:
    if h < 12:
        return "matin"
    if h < 14:
        return "milieu_journee"
    return "apres_midi"


@router.post("/annulation")
def predict_annulation(data: AnnulationInput):
    ms = store.models
    if ms is None:
        raise HTTPException(503, "Modèles non encore chargés")

    est_weekend = int(data.jour_semaine >= 5)
    creneau = _creneau(data.heure_debut_h)

    row = {
        "jour_semaine": data.jour_semaine,
        "mois": data.mois,
        "est_weekend": est_weekend,
        "heure_debut_h": data.heure_debut_h,
        "age": data.age,
        "nb_rdv_total": data.nb_rdv_total,
        "nb_annulations_passees": data.nb_annulations_passees,
        "taux_annulation_historique": data.taux_annulation_historique,
        "sexe": data.sexe,
        "gouvernorat": data.gouvernorat,
        "methode_contact_preferee": data.methode_contact_preferee,
        "creneau": creneau,
        "specialite_nom": data.specialite_nom,
        "experience_annees": data.experience_annees,
        "prix_vs_moyenne": data.prix_vs_moyenne,
        "taux_annulation_motif": data.taux_annulation_motif,
    }

    df = pd.DataFrame([row])

    # 1. Encoder les colonnes catégorielles
    le_dict = ms.annulation_label_encoders
    for col in CAT_COLS:
        if col in le_dict:
            le = le_dict[col]
            try:
                df[col] = le.transform(df[col])
            except ValueError:
                df[col] = 0

    # 2. Appliquer l'imputer uniquement sur les colonnes numériques
    df[NUM_COLS] = ms.annulation_imputer.transform(df[NUM_COLS])

    # 3. Passer toutes les features dans le bon ordre au modèle
    X = df[ALL_FEATURES].values
    proba = float(ms.annulation_model.predict_proba(X)[0][1])
    pct = round(proba * 100, 1)

    if pct >= 60:
        niveau, couleur = "ÉLEVÉ", "#dc2626"
        recommandation = "Envoyer un rappel SMS 24h avant le rendez-vous"
    elif pct >= 37:
        niveau, couleur = "MOYEN", "#f59e0b"
        recommandation = "Confirmer le rendez-vous par email la veille"
    else:
        niveau, couleur = "FAIBLE", "#16a34a"
        recommandation = "Aucune action particulière requise"

    return {
        "probabiliteAnnulation": round(proba, 4),   # 0.0–1.0 (Angular multiplie par 100)
        "niveauRisque": niveau,
        "couleur": couleur,
        "recommandation": recommandation,
        "creneauDetecte": creneau,
        "estWeekend": bool(est_weekend),
    }
