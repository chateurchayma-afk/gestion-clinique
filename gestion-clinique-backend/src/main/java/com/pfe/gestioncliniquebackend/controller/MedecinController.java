package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.MedecinFullUpdateRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinValidationRequest;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.service.MedecinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medecins")
@RequiredArgsConstructor
public class MedecinController {

    private final MedecinService medecinService;

    @GetMapping("/en-attente")
    public List<Medecin> getMedecinsEnAttente() {
        return medecinService.getMedecinsEnAttente();
    }

    @GetMapping
    public List<Medecin> getAllMedecins() {
        return medecinService.getAllMedecins();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Medecin> getMedecin(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(medecinService.getMedecinById(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/validation")
    public ResponseEntity<?> validerOuRefuser(@PathVariable Long id, @RequestBody MedecinValidationRequest body) {
        try {
            return ResponseEntity.ok(medecinService.updateStatutValidation(id, body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping
    public Medecin ajouterMedecin(@RequestBody MedecinRequest request) {
        return medecinService.ajouterMedecinComplet(request);
    }

    @DeleteMapping("/{id}")
    public void supprimerMedecin(@PathVariable Long id) {
        medecinService.deleteMedecin(id);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMedecin(@PathVariable Long id, @Valid @RequestBody MedecinFullUpdateRequest request) {
        try {
            return ResponseEntity.ok(medecinService.updateMedecin(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
