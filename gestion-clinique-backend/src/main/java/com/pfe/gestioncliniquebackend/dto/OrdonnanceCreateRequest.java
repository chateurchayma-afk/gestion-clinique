package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class OrdonnanceCreateRequest {
    private Long patientId;
    private LocalDate dateOrdonnance;
    private String medicamentsText;
    private String qrUrl;
}
