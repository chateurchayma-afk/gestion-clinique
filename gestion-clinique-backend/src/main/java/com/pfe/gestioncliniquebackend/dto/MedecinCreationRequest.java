package com.pfe.gestioncliniquebackend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class MedecinCreationRequest {
    @NotBlank(message = "Le nom est obligatoire")
    private String nom;

    @NotBlank(message = "Le prénom est obligatoire")
    private String prenom;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 6, message = "Le mot de passe doit contenir au moins 6 caractères")
    private String motDePasse;

    @NotBlank(message = "Le téléphone est obligatoire")
    @Pattern(regexp = "^\\+?[0-9\\s\\-\\(\\)]{8,15}$", message = "Le numéro de téléphone doit être valide")
    private String telephone;

    private String adresse;
    private String ville;
    private String gouvernorat;
    private String codePostal;

    @Past(message = "La date de naissance doit être dans le passé")
    private LocalDate dateNaissance;

    private String sexe; // HOMME, FEMME

    private Integer experienceAnnees;
    private String matricule;
    private String biographie;
    private Long specialiteId;
    private Long serviceMedicalId;
    private Boolean disponible = true;
}