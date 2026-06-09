package com.pfe.gestioncliniquebackend.dto;

import com.pfe.gestioncliniquebackend.enums.JourSemaine;
import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;

@Data
@Builder
public class DisponibiliteResponse {
    private Long id;
    private JourSemaine jour;
    private LocalTime heureDebut;
    private LocalTime heureFin;
}
