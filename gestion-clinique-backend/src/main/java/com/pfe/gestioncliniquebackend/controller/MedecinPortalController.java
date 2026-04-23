package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.service.MedecinAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Espace connecté médecin : profil et patients liés à ses rendez-vous.
 */
@RestController
@RequestMapping("/api/medecin")
@RequiredArgsConstructor
public class MedecinPortalController {

    private final MedecinAccessService medecinAccessService;

    /** {@code GET /api/medecin/moi} */
    @GetMapping("/moi")
    public ResponseEntity<?> moi() {
        try {
            return ResponseEntity.ok(medecinAccessService.requireMedecinConnecte());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** Patients ayant au moins un rendez-vous avec le médecin connecté. */
    @GetMapping("/mes-patients")
    public ResponseEntity<List<Patient>> mesPatients() {
        return ResponseEntity.ok(medecinAccessService.listerMesPatients());
    }
}
