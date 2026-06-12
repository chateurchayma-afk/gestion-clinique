package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.AdminRendezVousPlanningItem;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.service.AdminRendezVousService;
import com.pfe.gestioncliniquebackend.service.MedecinAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Espace connecté médecin : profil, patients et planning filtrés par JWT.
 */
@RestController
@RequestMapping("/api/medecin")
@RequiredArgsConstructor
public class MedecinPortalController {

    private final MedecinAccessService medecinAccessService;
    private final AdminRendezVousService adminRendezVousService;

    /** {@code GET /api/medecin/moi} — profil du médecin connecté via JWT */
    @GetMapping("/moi")
    public ResponseEntity<?> moi() {
        try {
            return ResponseEntity.ok(medecinAccessService.requireMedecinConnecte());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * {@code GET /api/medecin/mon-planning?start=YYYY-MM-DD&end=YYYY-MM-DD}
     * Retourne uniquement les RDV du médecin connecté — filtrage garanti côté serveur par JWT.
     * Impossible de voir les données d'un autre médecin.
     */
    @GetMapping("/mon-planning")
    public ResponseEntity<?> monPlanning(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        try {
            Medecin medecin = medecinAccessService.requireMedecinConnecte();
            List<AdminRendezVousPlanningItem> planning =
                    adminRendezVousService.listerPlanning(start, end, medecin.getId(), null);
            return ResponseEntity.ok(planning);
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
