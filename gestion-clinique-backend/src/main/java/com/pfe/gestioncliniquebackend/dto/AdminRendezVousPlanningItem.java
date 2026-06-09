package com.pfe.gestioncliniquebackend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.pfe.gestioncliniquebackend.enums.ModeConsultation;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminRendezVousPlanningItem {

    private Long id;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateRendezVous;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime heureDebut;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime heureFin;
    private StatutRendezVous statut;
    private ModeConsultation modeConsultation;
    private String motif;

    private Long patientId;
    private String patientNom;
    private String patientPrenom;

    private Long medecinId;
    private String medecinNom;
    private String medecinPrenom;

    /** Indique une annulation initiée par le patient (non réactivable par l’admin). */
    private boolean annuleParPatient;

    private Double prixConsultation;
}
