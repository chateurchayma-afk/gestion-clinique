package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;

@Data
public class AnnulationRequest {
    private int jourSemaine;          // 0=Lundi … 6=Dimanche
    private int mois;                 // 1-12
    private int heureDebutH;          // 0-23
    private int age;
    private int nbRdvTotal;
    private int nbAnnulationsPassees;
    private double tauxAnnulationHistorique;
    private String sexe;              // FEMME | HOMME
    private String gouvernorat;
    private String methodeContactPreferee; // EMAIL | SMS | TELEPHONE
    private String specialiteNom;
    private int experienceAnnees;
    private double prixVsMoyenne;
    private double tauxAnnulationMotif;
}
