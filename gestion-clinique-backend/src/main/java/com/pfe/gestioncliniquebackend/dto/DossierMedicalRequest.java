package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class DossierMedicalRequest {
    private String groupeSanguin;
    private String tailleCm;
    private String poidsKg;
    private String allergies;
    private String medicaments;
    private String maladiesChroniques;
    private String interventions;
    private String hospitalisations;

    private boolean famDiabete;
    private boolean famHypertension;
    private boolean famAsthme;
    private boolean famCardiaque;
    private boolean famMentaux;
    private boolean famCancer;

    private String tabac;
    private String alcool;
    private String activite;
    private String alimentation;

    private String rappelTraitementNom;
    private String rappelTraitementFrequence;
}
