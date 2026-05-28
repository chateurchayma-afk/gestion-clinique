package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class MedecinRequest {
    private Long utilisateurId;
    private Integer experienceAnnees;
    private String matricule;
    private String biographie;
    private Long specialiteId;
    private Boolean disponible;
}