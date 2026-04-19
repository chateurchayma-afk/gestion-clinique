package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProchainCreneauResponse {

    private LocalDate date;
    private LocalTime heureDebut;
    private LocalTime heureFin;
}
