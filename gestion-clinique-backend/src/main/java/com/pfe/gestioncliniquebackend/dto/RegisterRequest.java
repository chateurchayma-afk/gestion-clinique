package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class RegisterRequest {
    private String nom;
    private String prenom;
    private String email;
    private String motDePasse;
    private String telephone;
    private String adresse;
    private String ville;
    private String gouvernorat;
    private String codePostal;
    private LocalDate dateNaissance;
    private String sexe;
    private String situationMatrimoniale;
    private String contactUrgenceNom;
    private String contactUrgenceTelephone;
    private String methodeContactPreferee;
    private String numeroDossier;

    /** Réservé à l’inscription médecin : id de la spécialité choisie dans la liste */
    private Long specialiteId;
}