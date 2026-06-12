package com.pfe.gestioncliniquebackend.dto;

import com.pfe.gestioncliniquebackend.entity.DossierMedicalVersion;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class DossierMedicalVersionResponse {

    Long id;
    int versionNumero;
    LocalDateTime modifieLe;
    String modifieParNom;
    String modifieParPrenom;

    String groupeSanguin;
    String tailleCm;
    String poidsKg;
    String allergies;
    String medicaments;
    String maladiesChroniques;
    String interventions;
    String hospitalisations;

    boolean famDiabete;
    boolean famHypertension;
    boolean famAsthme;
    boolean famCardiaque;
    boolean famMentaux;
    boolean famCancer;

    String tabac;
    String alcool;
    String activite;
    String alimentation;
    String rappelTraitementNom;
    String rappelTraitementFrequence;

    public static DossierMedicalVersionResponse from(DossierMedicalVersion v) {
        String nom = v.getModifiePar() != null && v.getModifiePar().getUtilisateur() != null
                ? v.getModifiePar().getUtilisateur().getNom() : null;
        String prenom = v.getModifiePar() != null && v.getModifiePar().getUtilisateur() != null
                ? v.getModifiePar().getUtilisateur().getPrenom() : null;

        return DossierMedicalVersionResponse.builder()
                .id(v.getId())
                .versionNumero(v.getVersionNumero())
                .modifieLe(v.getModifieLe())
                .modifieParNom(nom)
                .modifieParPrenom(prenom)
                .groupeSanguin(v.getGroupeSanguin())
                .tailleCm(v.getTailleCm())
                .poidsKg(v.getPoidsKg())
                .allergies(v.getAllergies())
                .medicaments(v.getMedicaments())
                .maladiesChroniques(v.getMaladiesChroniques())
                .interventions(v.getInterventions())
                .hospitalisations(v.getHospitalisations())
                .famDiabete(v.isFamDiabete())
                .famHypertension(v.isFamHypertension())
                .famAsthme(v.isFamAsthme())
                .famCardiaque(v.isFamCardiaque())
                .famMentaux(v.isFamMentaux())
                .famCancer(v.isFamCancer())
                .tabac(v.getTabac())
                .alcool(v.getAlcool())
                .activite(v.getActivite())
                .alimentation(v.getAlimentation())
                .rappelTraitementNom(v.getRappelTraitementNom())
                .rappelTraitementFrequence(v.getRappelTraitementFrequence())
                .build();
    }
}
