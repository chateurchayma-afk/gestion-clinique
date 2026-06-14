import joblib
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"


class ModelStore:
    # ML-01 Annulation
    annulation_model = None
    annulation_imputer = None
    annulation_label_encoders = None

    # ML-02 Recommandation
    rec_interactions = None
    rec_matrice = None
    rec_medecin_ids = None
    rec_med_enrichi = None
    rec_med_idx = None
    rec_patient_ids = None
    rec_pat_enrichi = None
    rec_pat_idx = None

    # ML-03 Urgence
    urgence_model = None
    urgence_vectorizer = None
    urgence_label_encoder = None

    # ML-04 Prévision
    prevision_model = None
    prevision_serie = None

    # ML-05 Anomalie
    anomalie_model = None
    anomalie_scaler = None

    # ML-06 Segmentation
    seg_model = None
    seg_scaler = None
    seg_pca = None


models: ModelStore = None


def load_all_models() -> ModelStore:
    store = ModelStore()

    print("[ML-01] Chargement Annulation...")
    store.annulation_model = joblib.load(MODELS_DIR / "medichat_annulation_model.pkl")
    store.annulation_imputer = joblib.load(MODELS_DIR / "medichat_imputer.pkl")
    store.annulation_label_encoders = joblib.load(MODELS_DIR / "medichat_label_encoders.pkl")

    print("[ML-02] Chargement Recommandation...")
    store.rec_interactions = joblib.load(MODELS_DIR / "ml02_interactions.pkl")
    store.rec_matrice = joblib.load(MODELS_DIR / "ml02_matrice.pkl")
    store.rec_medecin_ids = joblib.load(MODELS_DIR / "ml02_medecin_ids.pkl")
    store.rec_med_enrichi = joblib.load(MODELS_DIR / "ml02_med_enrichi.pkl")
    store.rec_med_idx = joblib.load(MODELS_DIR / "ml02_med_idx.pkl")
    store.rec_patient_ids = joblib.load(MODELS_DIR / "ml02_patient_ids.pkl")
    store.rec_pat_enrichi = joblib.load(MODELS_DIR / "ml02_pat_enrichi.pkl")
    store.rec_pat_idx = joblib.load(MODELS_DIR / "ml02_pat_idx.pkl")

    print("[ML-03] Chargement Urgence...")
    store.urgence_model = joblib.load(MODELS_DIR / "ml03_model_urgence.pkl")
    store.urgence_vectorizer = joblib.load(MODELS_DIR / "ml03_vectorizer.pkl")
    store.urgence_label_encoder = joblib.load(MODELS_DIR / "ml03_label_encoder.pkl")

    print("[ML-04] Chargement Prevision de charge...")
    store.prevision_model = joblib.load(MODELS_DIR / "ml04_model_prevision.pkl")
    store.prevision_serie = joblib.load(MODELS_DIR / "ml04_serie_historique.pkl")

    print("[ML-05] Chargement Anomalie prescriptions...")
    store.anomalie_model = joblib.load(MODELS_DIR / "ml05_model_anomalie.pkl")
    store.anomalie_scaler = joblib.load(MODELS_DIR / "ml05_scaler.pkl")

    print("[ML-06] Chargement Segmentation patients...")
    store.seg_model = joblib.load(MODELS_DIR / "ml06_model_kmeans.pkl")
    store.seg_scaler = joblib.load(MODELS_DIR / "ml06_scaler.pkl")
    store.seg_pca = joblib.load(MODELS_DIR / "ml06_pca.pkl")

    print("[OK] Tous les modeles ML charges avec succes")
    return store
