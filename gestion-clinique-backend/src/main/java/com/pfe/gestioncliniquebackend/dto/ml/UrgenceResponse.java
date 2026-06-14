package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;
import java.util.Map;

@Data
public class UrgenceResponse {
    private String niveau;
    private String couleur;
    private Map<String, Double> probabilites;
    private String message;
}
