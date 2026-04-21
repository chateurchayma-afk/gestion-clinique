package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.PatientUpdateRequest;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.service.PatientAccessService;
import com.pfe.gestioncliniquebackend.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/patient/profil")
@RequiredArgsConstructor
public class PatientProfilController {

    private final PatientAccessService patientAccessService;
    private final PatientService patientService;

    @GetMapping
    public ResponseEntity<Patient> getProfil() {
        return ResponseEntity.ok(patientAccessService.requireCurrentPatient());
    }

    @PutMapping
    public ResponseEntity<?> updateProfil(@RequestBody PatientUpdateRequest body) {
        try {
            Patient p = patientAccessService.requireCurrentPatient();
            return ResponseEntity.ok(patientService.updatePatient(p.getId(), body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
