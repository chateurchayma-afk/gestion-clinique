from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import core.model_store as model_store
from routers import annulation, recommandation, urgence, prevision, anomalie, segmentation


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_store.models = model_store.load_all_models()
    yield
    print("[STOP] Service ML arrete")


app = FastAPI(
    title="MediChat ML Service",
    description="API de prédiction ML pour la plateforme MediChat",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:4200", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(annulation.router, prefix="/predict", tags=["ML-01 Annulation"])
app.include_router(recommandation.router, prefix="/predict", tags=["ML-02 Recommandation"])
app.include_router(urgence.router, prefix="/predict", tags=["ML-03 Urgence"])
app.include_router(prevision.router, prefix="/predict", tags=["ML-04 Prévision"])
app.include_router(anomalie.router, prefix="/predict", tags=["ML-05 Anomalie"])
app.include_router(segmentation.router, prefix="/predict", tags=["ML-06 Segmentation"])


@app.get("/health", tags=["Health"])
def health():
    loaded = model_store.models is not None
    return {"status": "ok" if loaded else "loading", "service": "MediChat ML API", "models_loaded": loaded}
