package com.pfe.gestioncliniquebackend.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientDossierResponse {

    // ── Informations personnelles ───────────────────────────────────────
    private String nom;
    private String prenom;
    private LocalDate dateNaissance;
    private String sexe;
    private String numeroDossier;

    // ── Dossier médical ─────────────────────────────────────────────────
    private Long dossierId;
    private String groupeSanguin;
    private String tailleCm;
    private String poidsKg;
    private String allergies;
    private String medicaments;
    private String maladiesChroniques;
    private String interventions;
    private String hospitalisations;

    // Antécédents familiaux
    private boolean famDiabete;
    private boolean famHypertension;
    private boolean famAsthme;
    private boolean famCardiaque;
    private boolean famMentaux;
    private boolean famCancer;

    // Mode de vie
    private String tabac;
    private String alcool;
    private String activite;
    private String alimentation;

    // Traitement actuel
    private String rappelTraitementNom;
    private String rappelTraitementFrequence;

    // ── Dernière modification ───────────────────────────────────────────
    private LocalDateTime updatedAt;
    private String updatedByMedecinNom;
    private String updatedByMedecinPrenom;

    // ── Historique consultations ────────────────────────────────────────
    private List<RendezVousHistoriqueItem> historique;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RendezVousHistoriqueItem {
        private Long id;
        private LocalDate dateRendezVous;
        private String heureDebut;
        private String medecinNom;
        private String medecinPrenom;
        private String medecinSpecialite;
        private String motif;
        private String statut;
        private String modeConsultation;
        private Double prixConsultation;
    }
}
