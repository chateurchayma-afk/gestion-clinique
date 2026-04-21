package com.pfe.gestioncliniquebackend.dto;

import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AdminRendezVousStatutRequest {

    @NotNull
    private StatutRendezVous statut;
}
