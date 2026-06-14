from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import core.model_store as store

router = APIRouter()

FEATURES = [
    "age", "tranche_age", "sexe_enc", "situation_matrimoniale_enc",
    "methode_contact_preferee_enc", "nb_rdv_total", "taux_annulation",
    "taux_completion", "nb_consultations", "nb_ordonnances",
    "nb_specialites_distinctes", "prix_moy_consultation",
]

CLUSTER_NAMES = {
    0: "Patients à Risque Annulation",
    1: "Patients Sans Consultation",
    2: "Patients Actifs & Fiables",
}
CLUSTER_DESCRIPTIONS = {
    0: "Ce patient annule fréquemment ses rendez-vous. Des rappels renforcés sont recommandés.",
    1: "Ce patient a peu de consultations effectives malgré ses RDV. Encourager le suivi médical régulier.",
    2: "Patient fiable et actif. Profil idéal pour des consultations régulières et un suivi préventif.",
}
CLUSTER_COLORS = {0: "#f59e0b", 1: "#3b82f6", 2: "#16a34a"}
CLUSTER_EMOJIS = {0: "⚠️", 1: "😴", 2: "✅"}
CLUSTER_SIZES = {0: 2500, 1: 4549, 2: 1423}


class SegmentationInput(BaseModel):
    age: int
    sexe_enc: int                       # 0=FEMME  1=HOMME
    situation_matrimoniale_enc: int     # 0=Célibataire 1=Marié(e) 2=Divorcé(e) 3=Veuf(ve)
    methode_contact_preferee_enc: int   # 0=EMAIL  1=SMS  2=TELEPHONE
    nb_rdv_total: int
    taux_annulation: float              # 0.0 – 1.0
    taux_completion: float              # 0.0 – 1.0
    nb_consultations: int
    nb_ordonnances: int
    nb_specialites_distinctes: int
    prix_moy_consultation: float


@router.post("/segmentation")
def predict_segmentation(data: SegmentationInput):
    ms = store.models
    if ms is None:
        raise HTTPException(503, "Modèles non encore chargés")

    tranche_age = 0 if data.age < 30 else (1 if data.age < 50 else 2)

    row = {
        "age": data.age,
        "tranche_age": tranche_age,
        "sexe_enc": data.sexe_enc,
        "situation_matrimoniale_enc": data.situation_matrimoniale_enc,
        "methode_contact_preferee_enc": data.methode_contact_preferee_enc,
        "nb_rdv_total": data.nb_rdv_total,
        "taux_annulation": data.taux_annulation,
        "taux_completion": data.taux_completion,
        "nb_consultations": data.nb_consultations,
        "nb_ordonnances": data.nb_ordonnances,
        "nb_specialites_distinctes": data.nb_specialites_distinctes,
        "prix_moy_consultation": data.prix_moy_consultation,
    }

    df = pd.DataFrame([row])[FEATURES]
    df_scaled = ms.seg_scaler.transform(df)
    # KMeans entraîné sur les 12 features scalées directement (PCA = visualisation uniquement)
    cluster = int(ms.seg_model.predict(df_scaled)[0])

    return {
        "cluster": cluster,
        "emoji": CLUSTER_EMOJIS[cluster],
        "nomCluster": CLUSTER_NAMES[cluster],
        "couleur": CLUSTER_COLORS[cluster],
        "description": CLUSTER_DESCRIPTIONS[cluster],
        "tailleGroupe": CLUSTER_SIZES[cluster],
    }
