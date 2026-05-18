package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.PatientProfilResponse;
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
    public ResponseEntity<PatientProfilResponse> getProfil() {
        Patient p = patientAccessService.requireCurrentPatient();
        return ResponseEntity.ok(PatientProfilResponse.from(p));
    }

    @PutMapping
    public ResponseEntity<?> updateProfil(@RequestBody PatientUpdateRequest body) {
        try {
            Patient p = patientAccessService.requireCurrentPatient();
            Patient updated = patientService.updatePatient(p.getId(), body, true);
            return ResponseEntity.ok(PatientProfilResponse.from(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
