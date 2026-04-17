package com.pfe.gestioncliniquebackend.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Profil administrateur lié à {@link Utilisateur} (même principe que {@link Patient} / {@link Medecin}).
 * Table SQL : {@code administrateur} (évite le mot réservé / ambiguïté {@code admin} côté MySQL).
 */
@Entity
@Table(name = "administrateur")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Administrateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    /** Libellé optionnel (ex. rôle interne, service). */
    private String fonction;
}
