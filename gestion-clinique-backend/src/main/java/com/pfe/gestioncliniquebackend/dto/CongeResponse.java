package com.pfe.gestioncliniquebackend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class CongeResponse {
    private Long id;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String motif;
}
