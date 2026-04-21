package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private String adresse;
    private String ville;
    private String gouvernorat;
    private String codePostal;
    /** Si renseigné et non vide, remplace le mot de passe du compte. */
    private String motDePasse;
}