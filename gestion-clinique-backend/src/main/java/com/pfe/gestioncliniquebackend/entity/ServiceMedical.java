package com.pfe.gestioncliniquebackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "service_medical")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceMedical {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String departement;
    private String prix;
    private String description;
}