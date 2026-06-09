package com.pfe.gestioncliniquebackend.dto;

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
public class RendezVousResponse {

    private Long id;
    private Long medecinId;
    private String medecinNom;
    private String medecinPrenom;
    private String specialiteNom;
    private LocalDate dateRendezVous;
    private LocalTime heureDebut;
    private LocalTime heureFin;
    private ModeConsultation modeConsultation;
    private String motif;
    private StatutRendezVous statut;
    private Double prixConsultation;
}
