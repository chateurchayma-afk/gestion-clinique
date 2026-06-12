package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.DossierMedicalRequest;
import com.pfe.gestioncliniquebackend.dto.DossierMedicalResponse;
import com.pfe.gestioncliniquebackend.dto.DossierMedicalVersionResponse;
import com.pfe.gestioncliniquebackend.service.DossierMedicalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medecin/dossier-medical")
@RequiredArgsConstructor
public class DossierMedicalController {

    private final DossierMedicalService dossierMedicalService;

    @GetMapping("/{patientId}")
    public ResponseEntity<?> getDossier(@PathVariable Long patientId) {
        try {
            DossierMedicalResponse response = dossierMedicalService.getByPatientId(patientId);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        }
    }

    @PutMapping("/{patientId}")
    public ResponseEntity<?> saveDossier(
            @PathVariable Long patientId,
            @RequestBody DossierMedicalRequest request
    ) {
        try {
            DossierMedicalResponse response = dossierMedicalService.saveForPatient(patientId, request);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        }
    }

    @GetMapping("/{patientId}/historique")
    public ResponseEntity<?> getHistorique(@PathVariable Long patientId) {
        try {
            List<DossierMedicalVersionResponse> versions = dossierMedicalService.getHistorique(patientId);
            return ResponseEntity.ok(versions);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        }
    }
}
