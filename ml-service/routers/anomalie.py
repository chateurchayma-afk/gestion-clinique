from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import core.model_store as store

router = APIRouter()

MED_COLS = [
    "Amoxicilline 1g", "Cetirizine 10mg", "Doliprane",
    "Ibuprofène 400mg", "Oméprazole 20mg", "Paracétamol 500mg",
    "Spasfon", "Vitamine D",
]

FEATURES = [
    "nb_medicaments", "nb_medicaments_uniques", "ratio_unicite",
    "posologie_code", "duree_max_jours", "experience_annees",
    "medecin_junior", "a_doublons", "nb_ord_medecin_total",
] + MED_COLS


class AnomalieInput(BaseModel):
    nb_medicaments: int
    nb_medicaments_uniques: int
    duree_max_jours: int
    posologie_code: int        # 1 = 1×/jour  2 = 2×/jour  3 = 3×/jour
    experience_annees: int
    medecin_junior: int        # 0 ou 1
    a_doublons: int            # 0 ou 1
    nb_ord_medecin_total: int
    amoxicilline_1g: int = 0
    cetirizine_10mg: int = 0
    doliprane: int = 0
    ibuprofene_400mg: int = 0
    omeprazole_20mg: int = 0
    paracetamol_500mg: int = 0
    spasfon: int = 0
    vitamine_d: int = 0


@router.post("/anomalie")
def predict_anomalie(data: AnomalieInput):
    ms = store.models
    if ms is None:
        raise HTTPException(503, "Modèles non encore chargés")

    ratio = (data.nb_medicaments_uniques / data.nb_medicaments) if data.nb_medicaments > 0 else 1.0

    row = {
        "nb_medicaments": data.nb_medicaments,
        "nb_medicaments_uniques": data.nb_medicaments_uniques,
        "ratio_unicite": ratio,
        "posologie_code": data.posologie_code,
        "duree_max_jours": data.duree_max_jours,
        "experience_annees": data.experience_annees,
        "medecin_junior": data.medecin_junior,
        "a_doublons": data.a_doublons,
        "nb_ord_medecin_total": data.nb_ord_medecin_total,
        "Amoxicilline 1g": data.amoxicilline_1g,
        "Cetirizine 10mg": data.cetirizine_10mg,
        "Doliprane": data.doliprane,
        "Ibuprofène 400mg": data.ibuprofene_400mg,
        "Oméprazole 20mg": data.omeprazole_20mg,
        "Paracétamol 500mg": data.paracetamol_500mg,
        "Spasfon": data.spasfon,
        "Vitamine D": data.vitamine_d,
    }

    df = pd.DataFrame([row])[FEATURES]
    df_scaled = ms.anomalie_scaler.transform(df)

    # Isolation Forest : decision_function → plus négatif = plus anomal
    score_raw = float(ms.anomalie_model.decision_function(df_scaled)[0])
    prediction = int(ms.anomalie_model.predict(df_scaled)[0])   # -1=anomalie, 1=normal

    # Normalisation 0-100 (100 = très suspect)
    score_risque = int(np.clip(((-score_raw + 0.3) / 0.6) * 100, 0, 100))
    est_anomalie = prediction == -1

    if score_risque >= 70:
        niveau, couleur = "ÉLEVÉ", "#dc2626"
        message = "Prescription suspecte — vérification manuelle recommandée"
    elif score_risque >= 40:
        niveau, couleur = "MOYEN", "#f59e0b"
        message = "Prescription atypique — à surveiller"
    else:
        niveau, couleur = "NORMAL", "#16a34a"
        message = "Prescription dans les normes habituelles"

    return {
        "scoreRisque": score_risque,
        "niveau": niveau,
        "couleur": couleur,
        "estAnomalie": est_anomalie,
        "message": message,
    }
