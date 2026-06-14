package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;

@Data
public class AnnulationResponse {
    private double probabiliteAnnulation;
    private String niveauRisque;
    private String couleur;
    private String recommandation;
    private String creneauDetecte;
    private boolean estWeekend;
}
