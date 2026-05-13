package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class OrdonnanceResponse {
    private Long id;
    private Long patientId;
    private Long medecinId;
    private LocalDate dateOrdonnance;
    private LocalDateTime createdAt;
}
