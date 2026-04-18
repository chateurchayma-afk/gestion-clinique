package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class PatientUpdateRequest {
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    /** Si null ou vide, le mot de passe n'est pas modifié */
    private String motDePasse;
    private String adresse;
    private String ville;
    private String gouvernorat;
    private String codePostal;
    private LocalDate dateNaissance;
    private String sexe;
    private String photo;
    private String situationMatrimoniale;
    private String contactUrgenceNom;
    private String contactUrgenceTelephone;
    private String methodeContactPreferee;
    private String numeroDossier;
}
