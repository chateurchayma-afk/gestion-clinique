package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class OrdonnanceNotificationRequest {
    private Long patientId;
    private String dateOrdonnance;
}
