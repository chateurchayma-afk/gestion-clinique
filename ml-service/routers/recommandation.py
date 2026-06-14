from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import numpy as np
import pandas as pd
import core.model_store as store

router = APIRouter()


class RecommandationInput(BaseModel):
    patient_id: Optional[int] = None
    specialite: Optional[str] = None
    top_n: int = 5


def _to_array(mat) -> np.ndarray:
    """Convertit matrice sparse ou dense en numpy array 2D."""
    if hasattr(mat, "toarray"):
        return mat.toarray()
    return np.array(mat)


@router.post("/recommandation")
def predict_recommandation(data: RecommandationInput):
    ms = store.models
    if ms is None:
        raise HTTPException(503, "Modèles non encore chargés")

    matrice = _to_array(ms.rec_matrice)       # (nb_patients, nb_medecins)
    pat_idx: dict = ms.rec_pat_idx
    med_enrichi = ms.rec_med_enrichi
    medecin_ids = ms.rec_medecin_ids          # liste ordonnée des 683 IDs médecins du modèle

    # ── Scores par patient ──────────────────────────────────────────────────
    mode = "popularite"
    if data.patient_id is not None and data.patient_id in pat_idx:
        p_idx = pat_idx[data.patient_id]
        scores = matrice[p_idx].flatten()
        mode = "collaboratif"
    else:
        scores = matrice.mean(axis=0).flatten()

    # ── DataFrame médecins — filtrer sur les 683 IDs connus du modèle ──────
    if isinstance(med_enrichi, pd.DataFrame):
        df_all = med_enrichi.copy()
    else:
        df_all = pd.DataFrame(med_enrichi)

    # Convertir medecin_ids en int pour matcher la colonne 'id'
    model_ids = [int(mid) for mid in medecin_ids]
    df_model = df_all[df_all["id"].isin(model_ids)].copy()
    # Trier dans l'ordre de medecin_ids pour que scores[i] corresponde au bon médecin
    id_to_score = {int(mid): float(scores[i]) for i, mid in enumerate(medecin_ids)}
    df_model = df_model.copy()
    df_model["_score"] = df_model["id"].map(id_to_score)

    # ── Filtre spécialité ───────────────────────────────────────────────────
    if data.specialite:
        mask = df_model["specialite_nom"].astype(str).str.lower().str.contains(
            data.specialite.lower(), na=False
        )
        filtered = df_model[mask]
        if len(filtered) > 0:
            df_model = filtered

    df = df_model.sort_values("_score", ascending=False).head(data.top_n).reset_index(drop=True)

    # Normaliser les scores pour un affichage significatif
    raw_scores = df["_score"].tolist()
    max_s = max(raw_scores) if raw_scores else 1.0
    min_s = min(raw_scores) if raw_scores else 0.0
    score_range = max_s - min_s

    def _normalize(raw: float, rank: int) -> float:
        if mode == "collaboratif":
            # Mode personnalisé : 0–100% selon le vrai score collaboratif
            if max_s > 0:
                return round(float(raw) / max_s * 100, 1)
            return 0.0
        else:
            # Mode popularité : 95% pour le top, 60% pour le dernier
            if score_range > 0:
                t = (float(raw) - min_s) / score_range   # 0 à 1
                return round(60 + t * 35, 1)
            # Tous identiques → rang décroissant
            n = len(raw_scores)
            return round(95 - rank * (35 / max(n - 1, 1)), 1)

    def _get(row, *keys, default=None):
        for k in keys:
            if k in row.index and pd.notna(row[k]):
                return row[k]
        return default

    results = []
    for rank, (_, row) in enumerate(df.iterrows()):
        results.append({
            "medecinId": int(_get(row, "id", "medecin_id", default=0)),
            "nom": str(_get(row, "nom_user", "nom", default="")),
            "prenom": str(_get(row, "prenom", default="")),
            "specialite": str(_get(row, "specialite_nom", "specialite", default="")),
            "scoreCompatibilite": _normalize(float(row["_score"]), rank),
            "experienceAnnees": int(_get(row, "experience_annees", default=0) or 0),
            "noteMoyenne": round(float(_get(row, "note_calculee", "note_moyenne", default=0) or 0), 1),
            "prixConsultation": float(_get(row, "prix_consultation", default=0) or 0),
        })

    return {"recommandations": results, "mode": mode, "nbResultats": len(results)}
