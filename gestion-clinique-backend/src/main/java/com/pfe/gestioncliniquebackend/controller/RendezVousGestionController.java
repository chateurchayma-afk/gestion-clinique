package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.AdminRendezVousCreateRequest;
import com.pfe.gestioncliniquebackend.dto.AdminRendezVousStatutRequest;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import com.pfe.gestioncliniquebackend.service.AdminRendezVousService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

/**
 * API « rendez-vous » côté clinique (réservations patients + planning admin), sur le même principe que
 * {@code /api/medecins} : chemins explicites sous un seul préfixe {@code /api/rendez-vous}.
 */
@RestController
@RequestMapping("/api/rendez-vous")
@RequiredArgsConstructor
public class RendezVousGestionController {

    private final AdminRendezVousService adminRendezVousService;

    /**
     * Planning sur une période. Option {@code statut} : ex. {@code CONFIRME} pour n’afficher que les RDV confirmés.
     * {@code GET /api/rendez-vous/planning?start=…&end=…&medecinId=…&statut=CONFIRME}
     */
    @GetMapping("/planning")
    public ResponseEntity<?> planning(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam(required = false) Long medecinId,
            @RequestParam(required = false) StatutRendezVous statut) {
        try {
            return ResponseEntity.ok(adminRendezVousService.listerPlanning(start, end, medecinId, statut));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** Création d’un RDV par l’admin (planning). {@code POST /api/rendez-vous} */
    @PostMapping
    public ResponseEntity<?> creer(@Valid @RequestBody AdminRendezVousCreateRequest body) {
        try {
            return ResponseEntity.ok(adminRendezVousService.creer(body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Liste complète (gestion). Filtre optionnel {@code statut} — ex. {@code EN_ATTENTE} comme
     * {@code GET /api/medecins/en-attente} pour les médecins.
     * {@code GET /api/rendez-vous/gestion}
     */
    @GetMapping("/gestion")
    public ResponseEntity<?> listerGestion(@RequestParam(required = false) StatutRendezVous statut) {
        try {
            return ResponseEntity.ok(adminRendezVousService.listerGestion(statut));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * RDV en attente de confirmation (raccourci).
     * {@code GET /api/rendez-vous/en-attente}
     */
    @GetMapping("/en-attente")
    public ResponseEntity<?> listerEnAttente() {
        try {
            return ResponseEntity.ok(adminRendezVousService.listerGestion(StatutRendezVous.EN_ATTENTE));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** {@code PATCH /api/rendez-vous/{id}/statut} — corps {@code {"statut":"CONFIRME"}}. */
    @PatchMapping("/{id}/statut")
    public ResponseEntity<?> modifierStatut(
            @PathVariable Long id,
            @Valid @RequestBody AdminRendezVousStatutRequest body) {
        try {
            return ResponseEntity.ok(adminRendezVousService.modifierStatut(id, body.getStatut()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
