package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;

@Data
public class AnomalieResponse {
    private int scoreRisque;
    private String niveau;
    private String couleur;
    private boolean estAnomalie;
    private String message;
}
