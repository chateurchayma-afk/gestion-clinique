package com.pfe.gestioncliniquebackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dossier_medical_version")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DossierMedicalVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierMedical dossier;

    @Column(name = "version_numero", nullable = false)
    private int versionNumero;

    @Column(name = "modifie_le", nullable = false)
    private LocalDateTime modifieLe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modifie_par_id")
    private Medecin modifiePar;

    private String groupeSanguin;
    private String tailleCm;
    private String poidsKg;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(columnDefinition = "TEXT")
    private String medicaments;

    @Column(columnDefinition = "TEXT")
    private String maladiesChroniques;

    @Column(columnDefinition = "TEXT")
    private String interventions;

    @Column(columnDefinition = "TEXT")
    private String hospitalisations;

    private boolean famDiabete;
    private boolean famHypertension;
    private boolean famAsthme;
    private boolean famCardiaque;
    private boolean famMentaux;
    private boolean famCancer;

    private String tabac;
    private String alcool;
    private String activite;

    @Column(columnDefinition = "TEXT")
    private String alimentation;

    @Column(name = "rappel_traitement_nom", length = 200)
    private String rappelTraitementNom;

    @Column(name = "rappel_traitement_frequence", length = 120)
    private String rappelTraitementFrequence;
}
