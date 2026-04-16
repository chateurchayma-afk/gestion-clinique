package com.pfe.gestioncliniquebackend.entity;

import com.pfe.gestioncliniquebackend.enums.MethodeContact;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "patient")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    private String situationMatrimoniale;

    private String contactUrgenceNom;
    private String contactUrgenceTelephone;

    @Enumerated(EnumType.STRING)
    private MethodeContact methodeContactPreferee;

    @Column(unique = true)
    private String numeroDossier;
}