package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrdonnancePatientResponse {
    private Long id;
    private String numeroOrdonnance;
    private LocalDate dateOrdonnance;
    private LocalDateTime createdAt;
    private String medecinNom;
    private String medecinPrenom;
    private String medecinSpecialite;
    private String medecinTelephone;
    private String medecinEmail;
    private String medicamentsText;
    private String qrUrl;
}
