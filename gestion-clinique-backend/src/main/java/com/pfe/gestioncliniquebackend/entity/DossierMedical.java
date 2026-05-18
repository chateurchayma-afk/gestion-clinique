package com.pfe.gestioncliniquebackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "dossier_medical")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DossierMedical {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "patient_id", nullable = false, unique = true)
    private Patient patient;

    private String groupeSanguin;
    private String tailleCm;
    private String poidsKg;
    private String allergies;
    private String medicaments;
    private String maladiesChroniques;
    private String interventions;
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
    private String alimentation;

    /** Nom du médicament / traitement à suivre (ex. Metformine). */
    @Column(name = "rappel_traitement_nom", length = 200)
    private String rappelTraitementNom;

    /** Code (ex. CHAQUE_JOUR) ou libellé libre pour la fréquence du rappel. */
    @Column(name = "rappel_traitement_frequence", length = 120)
    private String rappelTraitementFrequence;
}
