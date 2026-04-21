package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String message;
    private String token;
    private String role;
    private String email;
    /** Identifiant {@link com.pfe.gestioncliniquebackend.entity.Utilisateur} (présent si connexion réussie). */
    private Long id;
    private String nom;
    private String prenom;
}