package com.pfe.gestioncliniquebackend.dto;

import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.MethodeContact;
import com.pfe.gestioncliniquebackend.enums.Sexe;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class PatientProfilResponse {

    Long id;
    UtilisateurProfil utilisateur;
    String situationMatrimoniale;
    String contactUrgenceNom;
    String contactUrgenceTelephone;
    MethodeContact methodeContactPreferee;
    String numeroDossier;

    @Value
    @Builder
    public static class UtilisateurProfil {
        Long id;
        String nom;
        String prenom;
        String email;
        String telephone;
        String adresse;
        String ville;
        String gouvernorat;
        String codePostal;
        LocalDate dateNaissance;
        Sexe sexe;
        String photo;
    }

    public static PatientProfilResponse from(Patient patient) {
        Utilisateur u = patient.getUtilisateur();
        if (u == null) {
            throw new IllegalStateException("Patient sans utilisateur associé");
        }
        return PatientProfilResponse.builder()
                .id(patient.getId())
                .utilisateur(UtilisateurProfil.builder()
                        .id(u.getId())
                        .nom(u.getNom())
                        .prenom(u.getPrenom())
                        .email(u.getEmail())
                        .telephone(u.getTelephone())
                        .adresse(u.getAdresse())
                        .ville(u.getVille())
                        .gouvernorat(u.getGouvernorat())
                        .codePostal(u.getCodePostal())
                        .dateNaissance(u.getDateNaissance())
                        .sexe(u.getSexe())
                        .photo(u.getPhoto())
                        .build())
                .situationMatrimoniale(patient.getSituationMatrimoniale())
                .contactUrgenceNom(patient.getContactUrgenceNom())
                .contactUrgenceTelephone(patient.getContactUrgenceTelephone())
                .methodeContactPreferee(patient.getMethodeContactPreferee())
                .numeroDossier(patient.getNumeroDossier())
                .build();
    }
}
