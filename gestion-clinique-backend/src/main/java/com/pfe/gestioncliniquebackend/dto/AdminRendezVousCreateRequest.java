package com.pfe.gestioncliniquebackend.dto;

import com.pfe.gestioncliniquebackend.enums.ModeConsultation;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AdminRendezVousCreateRequest {

    @NotNull
    private Long patientId;

    @NotNull
    private Long medecinId;

    @NotNull
    private LocalDate dateRendezVous;

    @NotNull
    private LocalTime heureDebut;

    private LocalTime heureFin;

    @NotNull
    private ModeConsultation modeConsultation;

    private String motif;
}
