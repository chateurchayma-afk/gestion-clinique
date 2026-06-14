from fastapi import APIRouter, HTTPException
from datetime import date, timedelta
import numpy as np
import pandas as pd
import core.model_store as store

router = APIRouter()

FEATURES = [
    "jour_semaine", "mois", "semaine_annee", "trimestre", "est_weekend",
    "jour_mois", "est_debut_mois", "est_fin_mois",
    "lag_1", "lag_2", "lag_3", "lag_7", "lag_14",
    "rolling_7", "rolling_14", "rolling_30",
    "tendance", "jour_sin", "jour_cos", "mois_sin", "mois_cos",
]

JOURS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]


def _build_features(d: date, hist_nb_rdv: list, tendance_idx: int) -> dict:
    n = len(hist_nb_rdv)

    def lag(k):
        return float(hist_nb_rdv[-k]) if n >= k else 0.0

    def rolling(k):
        if n >= k:
            return float(np.mean(hist_nb_rdv[-k:]))
        return float(np.mean(hist_nb_rdv)) if hist_nb_rdv else 0.0

    return {
        "jour_semaine": d.weekday(),
        "mois": d.month,
        "semaine_annee": int(d.isocalendar()[1]),
        "trimestre": (d.month - 1) // 3 + 1,
        "est_weekend": int(d.weekday() >= 5),
        "jour_mois": d.day,
        "est_debut_mois": int(d.day <= 5),
        "est_fin_mois": int(d.day >= 25),
        "lag_1": lag(1),
        "lag_2": lag(2),
        "lag_3": lag(3),
        "lag_7": lag(7),
        "lag_14": lag(14),
        "rolling_7": rolling(7),
        "rolling_14": rolling(14),
        "rolling_30": rolling(30),
        "tendance": float(tendance_idx),
        "jour_sin": float(np.sin(2 * np.pi * d.weekday() / 7)),
        "jour_cos": float(np.cos(2 * np.pi * d.weekday() / 7)),
        "mois_sin": float(np.sin(2 * np.pi * d.month / 12)),
        "mois_cos": float(np.cos(2 * np.pi * d.month / 12)),
    }


@router.get("/prevision-charge")
def predict_prevision(date_debut: str = None, nb_jours: int = 30):
    ms = store.models
    if ms is None:
        raise HTTPException(503, "Modeles non encore charges")

    nb_jours = max(1, min(nb_jours, 180))   # borne : 1–180 jours

    df_hist = ms.prevision_serie
    model = ms.prevision_model

    # Extraire la liste historique nb_rdv et la dernière date
    if isinstance(df_hist, pd.DataFrame):
        hist_nb_rdv = df_hist["nb_rdv"].astype(float).tolist()
        last_date_raw = df_hist["date"].iloc[-1]
        if hasattr(last_date_raw, "date"):
            hist_last_date = last_date_raw.date()
        else:
            hist_last_date = pd.to_datetime(str(last_date_raw)).date()
        tendance_base = len(df_hist)
    elif isinstance(df_hist, pd.Series):
        hist_nb_rdv = df_hist.values.astype(float).tolist()
        last_idx = df_hist.index[-1]
        hist_last_date = pd.to_datetime(str(last_idx)).date() if not isinstance(last_idx, date) else last_idx
        tendance_base = len(df_hist)
    else:
        hist_nb_rdv = [float(v) for v in df_hist]
        hist_last_date = date.today() - timedelta(days=1)
        tendance_base = len(hist_nb_rdv)

    # Date de début : choisie par l'utilisateur ou le lendemain de l'historique
    if date_debut:
        try:
            start_date = date.fromisoformat(date_debut)
        except ValueError:
            start_date = hist_last_date + timedelta(days=1)
    else:
        start_date = hist_last_date + timedelta(days=1)

    # Décalage pour start_date (nb de jours après la fin de l'historique)
    offset = (start_date - hist_last_date).days - 1
    current = list(hist_nb_rdv)
    # Combler le vide entre hist et start_date si l'utilisateur choisit une date future
    for k in range(max(0, offset)):
        fill_date = hist_last_date + timedelta(days=k + 1)
        feats = _build_features(fill_date, current, tendance_base + k)
        X = pd.DataFrame([feats])[FEATURES]
        current.append(float(max(0, round(float(model.predict(X)[0])))))

    predictions = []
    for i in range(nb_jours):
        pred_date = start_date + timedelta(days=i)
        feats = _build_features(pred_date, current, tendance_base + max(0, offset) + i)
        X = pd.DataFrame([feats])[FEATURES]
        nb_rdv = max(0, round(float(model.predict(X)[0])))
        predictions.append({
            "date": str(pred_date),
            "jour": JOURS_FR[pred_date.weekday()],
            "nbRdvPrevu": nb_rdv,
            "estWeekend": pred_date.weekday() >= 5,
        })
        current.append(float(nb_rdv))

    total = sum(p["nbRdvPrevu"] for p in predictions)
    jours_ouvrables = [p for p in predictions if not p["estWeekend"]]
    moy = round(sum(p["nbRdvPrevu"] for p in jours_ouvrables) / len(jours_ouvrables), 1) if jours_ouvrables else 0

    return {
        "previsions": predictions,
        "total30j": total,
        "moyenneParJourOuvrable": moy,
        "periode": f"{predictions[0]['date']} → {predictions[-1]['date']}",
    }
