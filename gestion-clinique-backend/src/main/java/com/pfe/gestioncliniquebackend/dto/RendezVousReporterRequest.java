package com.pfe.gestioncliniquebackend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class RendezVousReporterRequest {

    @NotNull
    private LocalDate dateRendezVous;

    @NotNull
    private LocalTime heureDebut;

    /** Si absent, une durée par défaut de 30 minutes est appliquée. */
    private LocalTime heureFin;
}
