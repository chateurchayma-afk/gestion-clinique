package com.pfe.gestioncliniquebackend.entity;

import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "medecin")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medecin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    private Integer experienceAnnees;

    private String matricule;

    private String biographie;

    @Enumerated(EnumType.STRING)
    private StatutValidationMedecin statutValidation;

    @Builder.Default
    private Boolean disponible = true;

    /** Note affichée (0–5). Nullable si pas encore renseignée. */
    private Double noteMoyenne;

    /** Prix de consultation du médecin */
    private Double prixConsultation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "specialite_id")
    private Specialite specialite;

    
}