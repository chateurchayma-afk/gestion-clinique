package com.pfe.gestioncliniquebackend.dto.ml;

import lombok.Data;
import java.util.List;

@Data
public class PrevisionResponse {
    private List<JourPrevision> previsions;
    private int total30j;
    private double moyenneParJourOuvrable;
    private String periode;

    @Data
    public static class JourPrevision {
        private String date;
        private String jour;
        private int nbRdvPrevu;
        private boolean estWeekend;
    }
}
