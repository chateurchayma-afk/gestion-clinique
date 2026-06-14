package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;

@Data
public class RecommandationRequest {
    private Integer patientId;
    private String specialite;
    private int topN = 5;
}
