from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np
import core.model_store as store

router = APIRouter()

# Mots-clés qui déclassent URGENT → SUIVI si aucun mot grave n'est présent
DOWNGRADE_KEYWORDS = {
    "simple", "léger", "légère", "légères", "légers", "petit", "petite",
    "peu", "banal", "banale", "ordinaire", "rien de grave", "pas grave",
    "mineur", "mineure", "passager", "passagère", "bénin", "bénigne",
    "fatigue", "fatigué", "fatigués", "rhume", "courbature", "courbatures",
}

# Mots-clés qui confirment URGENT même avec des modificateurs
URGENT_KEYWORDS = {
    "infarctus", "avc", "paralysie", "perte de connaissance",
    "inconscient", "inconsciente", "saignement abondant", "fracture ouverte",
    "brûlure grave", "difficulté à respirer", "essoufflement sévère",
    "douleur thoracique", "douleur poitrine", "arrêt cardiaque",
    "convulsion", "convulsions", "allergie grave", "anaphylaxie",
}


def _apply_rules(texte: str, niveau: str, probas: dict) -> tuple[str, dict]:
    """Corrige les faux positifs URGENT du modèle via des règles lexicales."""
    t = texte.lower()
    mots = set(t.split())

    # Si un mot urgent explicite est présent → laisser le modèle décider
    if any(kw in t for kw in URGENT_KEYWORDS):
        return niveau, probas

    # Si URGENT prédit MAIS seulement des mots non-graves → reclasser SUIVI
    if niveau == "URGENT" and mots & DOWNGRADE_KEYWORDS:
        niveau = "SUIVI"
        # Redistribuer les probabilités vers SUIVI
        probas = {k: (0.75 if k == "SUIVI" else (0.15 if k == "NORMAL" else 0.10))
                  for k in probas}

    # Si le texte est très court (≤ 3 mots) et que ce n'est pas clairement urgent
    if len(t.split()) <= 3 and niveau == "URGENT":
        niveau = "SUIVI"
        probas = {k: (0.60 if k == "SUIVI" else (0.30 if k == "NORMAL" else 0.10))
                  for k in probas}

    return niveau, probas


class UrgenceInput(BaseModel):
    symptomes: str


@router.post("/urgence")
def predict_urgence(data: UrgenceInput):
    ms = store.models
    if ms is None:
        raise HTTPException(503, "Modèles non encore chargés")

    texte = data.symptomes.strip()
    X = ms.urgence_vectorizer.transform([texte])
    pred_enc = ms.urgence_model.predict(X)[0]
    probas_arr = ms.urgence_model.predict_proba(X)[0]

    le = ms.urgence_label_encoder
    if hasattr(le, "inverse_transform"):
        niveau = str(le.inverse_transform([pred_enc])[0])
        classes = [str(c) for c in le.classes_]
    else:
        niveau = str(pred_enc)
        classes = [str(c) for c in ms.urgence_model.classes_]

    proba_dict = {cls: round(float(p), 4) for cls, p in zip(classes, probas_arr)}

    # Appliquer les règles de bon sens
    niveau, proba_dict = _apply_rules(texte, niveau, proba_dict)

    couleur_map = {"URGENT": "#dc2626", "SUIVI": "#f59e0b", "NORMAL": "#16a34a"}
    message_map = {
        "URGENT": "Consultation immédiate recommandée — orienter vers les urgences",
        "SUIVI": "Planifier un suivi médical dans les 24-48h",
        "NORMAL": "Symptômes non urgents — consultation de routine suffisante",
    }

    return {
        "niveau": niveau,
        "couleur": couleur_map.get(niveau, "#3b82f6"),
        "probabilites": proba_dict,
        "message": message_map.get(niveau, ""),
    }
