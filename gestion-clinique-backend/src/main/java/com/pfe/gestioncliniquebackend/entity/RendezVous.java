package com.pfe.gestioncliniquebackend.entity;

import com.pfe.gestioncliniquebackend.enums.ModeConsultation;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "rendez_vous")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RendezVous {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medecin_id", nullable = false)
    private Medecin medecin;

    @Column(name = "date_rendez_vous")
    private LocalDate dateRendezVous;

    @Column(name = "heure_debut")
    private LocalTime heureDebut;

    @Column(name = "heure_fin")
    private LocalTime heureFin;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode_consultation")
    private ModeConsultation modeConsultation;

    @Column(columnDefinition = "TEXT")
    private String motif;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StatutRendezVous statut = StatutRendezVous.EN_ATTENTE;

    /** {@code true} si le patient a annulé depuis l’espace patient — l’admin ne peut pas réactiver ce RDV. */
    @Column(name = "annule_par_patient", nullable = false)
    @Builder.Default
    private boolean annuleParPatient = false;

    /** Prix de consultation pour ce rendez-vous */
    private Double prixConsultation;
}
