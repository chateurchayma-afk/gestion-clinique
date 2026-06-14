package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;

@Data
public class AnomalieRequest {
    private int nbMedicaments;
    private int nbMedicamentsUniques;
    private int dureeMaxJours;
    private int posologieCode;       // 1=1×/j  2=2×/j  3=3×/j
    private int experienceAnnees;
    private int medecinJunior;       // 0 ou 1
    private int aDoublons;           // 0 ou 1
    private int nbOrdMedecinTotal;
    private int amoxicilline1g;
    private int cetirizine10mg;
    private int doliprane;
    private int ibuprofene400mg;
    private int omeprazole20mg;
    private int paracetamol500mg;
    private int spasfon;
    private int vitamineD;
}
