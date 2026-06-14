package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;

@Data
public class SegmentationResponse {
    private int cluster;
    private String emoji;
    private String nomCluster;
    private String couleur;
    private String description;
    private int tailleGroupe;
}
