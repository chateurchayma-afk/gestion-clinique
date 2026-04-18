package com.pfe.gestioncliniquebackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * Mise à jour admin d’un médecin : compte {@code utilisateur} + fiche {@code medecin}.
 */
@Data
public class MedecinFullUpdateRequest {

    @NotBlank(message = "Le nom est obligatoire")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    private String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;

    @NotBlank(message = "Le téléphone est obligatoire")
    @Pattern(regexp = "^\\+?[0-9\\s\\-\\(\\)]{8,15}$", message = "Le numéro de téléphone doit être valide")
    private String telephone;

    /** Si null ou vide, le mot de passe n'est pas modifié (contrôle longueur côté service) */
    private String motDePasse;

    private String adresse;
    private String ville;
    private String gouvernorat;
    private String codePostal;

    private LocalDate dateNaissance;
    private String sexe;
    private String photo;

    private Integer experienceAnnees;
    private String matricule;
    /** Texte libre ; si vide, construit à partir des champs professionnels détaillés */
    private String biographie;

    private Long specialiteId;
    private Long serviceMedicalId;
    private Boolean disponible;

    private String qualifications;
    private String formation;
    private String certifications;
    private String departement;
    private String position;
}
