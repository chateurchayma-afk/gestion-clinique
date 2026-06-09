package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.CongeRequest;
import com.pfe.gestioncliniquebackend.dto.CongeResponse;
import com.pfe.gestioncliniquebackend.dto.DisponibiliteRequest;
import com.pfe.gestioncliniquebackend.dto.DisponibiliteResponse;
import com.pfe.gestioncliniquebackend.service.DisponibiliteCongeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DisponibiliteCongeController {

    private final DisponibiliteCongeService service;

    // ── Disponibilités ────────────────────────────────────────────────────────

    @GetMapping("/api/medecin/disponibilites")
    public List<DisponibiliteResponse> getDisponibilites() {
        return service.mesDisponibilites();
    }

    @PostMapping("/api/medecin/disponibilites")
    public ResponseEntity<?> addDisponibilite(@Valid @RequestBody DisponibiliteRequest req) {
        try {
            return ResponseEntity.ok(service.ajouterDisponibilite(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/api/medecin/disponibilites/{id}")
    public ResponseEntity<?> updateDisponibilite(@PathVariable Long id,
                                                  @Valid @RequestBody DisponibiliteRequest req) {
        try {
            return ResponseEntity.ok(service.modifierDisponibilite(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/api/medecin/disponibilites/{id}")
    public ResponseEntity<Void> deleteDisponibilite(@PathVariable Long id) {
        try {
            service.supprimerDisponibilite(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Congés ────────────────────────────────────────────────────────────────

    @GetMapping("/api/medecin/conges")
    public List<CongeResponse> getConges() {
        return service.mesConges();
    }

    @PostMapping("/api/medecin/conges")
    public ResponseEntity<?> addConge(@Valid @RequestBody CongeRequest req) {
        try {
            return ResponseEntity.ok(service.ajouterConge(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/api/medecin/conges/{id}")
    public ResponseEntity<?> updateConge(@PathVariable Long id,
                                          @Valid @RequestBody CongeRequest req) {
        try {
            return ResponseEntity.ok(service.modifierConge(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/api/medecin/conges/{id}")
    public ResponseEntity<Void> deleteConge(@PathVariable Long id) {
        try {
            service.supprimerConge(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── Endpoints publics (visibles par les patients) ─────────────────────────

    @GetMapping("/api/medecins/{id}/disponibilites")
    public List<DisponibiliteResponse> getDisponibilitesPubliques(@PathVariable Long id) {
        return service.disponibilitesPubliques(id);
    }

    @GetMapping("/api/medecins/{id}/conges")
    public List<CongeResponse> getCongesPublics(@PathVariable Long id) {
        return service.congesPublics(id);
    }
}
