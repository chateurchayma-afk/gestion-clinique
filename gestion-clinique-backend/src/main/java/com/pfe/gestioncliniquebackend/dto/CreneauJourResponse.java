package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreneauJourResponse {

    private LocalDate date;
    private List<LocalTime> heuresDebut;
}
