package com.pfe.gestioncliniquebackend.dto;

import com.pfe.gestioncliniquebackend.enums.JourSemaine;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class DisponibiliteRequest {

    @NotNull(message = "Le jour est obligatoire")
    private JourSemaine jour;

    @NotNull(message = "L'heure de début est obligatoire")
    private LocalTime heureDebut;

    @NotNull(message = "L'heure de fin est obligatoire")
    private LocalTime heureFin;
}
