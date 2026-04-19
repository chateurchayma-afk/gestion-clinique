package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.RendezVousCreateRequest;
import com.pfe.gestioncliniquebackend.dto.RendezVousResponse;
import com.pfe.gestioncliniquebackend.service.RendezVousPatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patient/rendez-vous")
@RequiredArgsConstructor
public class PatientRendezVousController {

    private final RendezVousPatientService rendezVousPatientService;

    @GetMapping
    public List<RendezVousResponse> lister() {
        return rendezVousPatientService.listerPourPatientConnecte();
    }

    @PostMapping
    public ResponseEntity<?> creer(@Valid @RequestBody RendezVousCreateRequest body) {
        try {
            return ResponseEntity.ok(rendezVousPatientService.creer(body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/annuler")
    public ResponseEntity<?> annuler(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(rendezVousPatientService.annuler(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
