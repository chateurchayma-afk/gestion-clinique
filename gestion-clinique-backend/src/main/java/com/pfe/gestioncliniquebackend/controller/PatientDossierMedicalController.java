package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.RappelTraitementPatientResponse;
import com.pfe.gestioncliniquebackend.service.DossierMedicalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/patient/dossier-medical")
@RequiredArgsConstructor
public class PatientDossierMedicalController {

    private final DossierMedicalService dossierMedicalService;

    @GetMapping("/rappel-traitement")
    public ResponseEntity<RappelTraitementPatientResponse> getRappelTraitement() {
        return ResponseEntity.ok(dossierMedicalService.getRappelTraitementPourPatientConnecte());
    }
}
