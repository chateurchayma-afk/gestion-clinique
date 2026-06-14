package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;

@Data
public class SegmentationRequest {
    private int age;
    private int sexeEnc;                    // 0=FEMME  1=HOMME
    private int situationMatrimonialeEnc;   // 0=Célibataire 1=Marié(e) 2=Divorcé(e) 3=Veuf(ve)
    private int methodeContactPrefereeEnc;  // 0=EMAIL  1=SMS  2=TELEPHONE
    private int nbRdvTotal;
    private double tauxAnnulation;
    private double tauxCompletion;
    private int nbConsultations;
    private int nbOrdonnances;
    private int nbSpecialitesDistinctes;
    private double prixMoyConsultation;
}
