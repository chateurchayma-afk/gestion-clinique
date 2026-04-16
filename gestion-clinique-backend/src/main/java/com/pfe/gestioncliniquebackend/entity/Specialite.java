package com.pfe.gestioncliniquebackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "specialite")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Specialite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nom;

    private String description;
}