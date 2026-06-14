package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;
import java.util.List;

@Data
public class RecommandationResponse {
    private List<MedecinRecommande> recommandations;
    private String mode;
    private int nbResultats;

    @Data
    public static class MedecinRecommande {
        private int medecinId;
        private String nom;
        private String prenom;
        private String specialite;
        private double scoreCompatibilite;
        private int experienceAnnees;
        private double noteMoyenne;
        private double prixConsultation;
    }
}
