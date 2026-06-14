@echo off
echo ========================================
echo   MediChat ML Service - Demarrage
echo ========================================
cd /d "%~dp0"

set CONDA_ENV=C:\Users\samira\Anaconda3\envs\medichat-ml
set PYTHON=%CONDA_ENV%\python.exe
set UVICORN=%CONDA_ENV%\Scripts\uvicorn.exe

echo Verification de l'environnement conda...
if not exist "%PYTHON%" (
    echo ERREUR: env conda 'medichat-ml' non trouve.
    echo Creez-le avec: conda create -n medichat-ml python=3.11 scikit-learn=1.6.1 numpy pandas scipy joblib -y
    pause
    exit /b 1
)

echo Service ML disponible sur : http://localhost:8000
echo Documentation Swagger     : http://localhost:8000/docs
echo.
%UVICORN% main:app --host 0.0.0.0 --port 8000 --reload
