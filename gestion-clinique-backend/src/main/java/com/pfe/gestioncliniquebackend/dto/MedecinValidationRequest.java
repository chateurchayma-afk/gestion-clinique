package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class MedecinValidationRequest {
    /** VALIDE ou REFUSE */
    private String statut;
}
