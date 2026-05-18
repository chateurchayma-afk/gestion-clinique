package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RappelTraitementPatientResponse {
    private boolean actif;
    private String traitement;
    private String frequence;
    private String messageRenouvellement;
}
