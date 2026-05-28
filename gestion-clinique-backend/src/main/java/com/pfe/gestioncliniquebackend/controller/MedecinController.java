package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.CatalogueHighlightsResponse;
import com.pfe.gestioncliniquebackend.dto.CreneauJourResponse;
import com.pfe.gestioncliniquebackend.dto.MedecinFullUpdateRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinValidationRequest;
import com.pfe.gestioncliniquebackend.dto.ProchainCreneauResponse;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.service.MedecinCatalogueService;
import com.pfe.gestioncliniquebackend.service.MedecinService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/medecins")
@RequiredArgsConstructor
public class MedecinController {

    private final MedecinService medecinService;
    private final MedecinCatalogueService medecinCatalogueService;

    @GetMapping("/en-attente")
    public List<Medecin> getMedecinsEnAttente() {
        return medecinService.getMedecinsEnAttente();
    }

    @GetMapping("/catalogue/highlights")
    public CatalogueHighlightsResponse catalogueHighlights() {
        return medecinCatalogueService.getHighlights();
    }

    /**
     * Catalogue public : filtres {@code specialiteId}, {@code q} (nom / prénom),
     * {@code disponible} (true / false, omis = tous), {@code sort} = nom | experience | disponible.
     */
    @GetMapping("/catalogue")
    public List<Medecin> getCatalogue(
            @RequestParam(required = false) Long specialiteId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean disponible,
            @RequestParam(required = false) String sort
    ) {
        return medecinCatalogueService.getCatalogue(specialiteId, q, disponible, sort);
    }

    @GetMapping("/catalogue/{id}/creneaux")
    public List<CreneauJourResponse> catalogueCreneaux(
            @PathVariable Long id,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) Integer days
    ) {
        return medecinCatalogueService.getCreneaux(id, from, days);
    }

    @GetMapping("/catalogue/{id}/prochain-creneau")
    public ResponseEntity<ProchainCreneauResponse> catalogueProchainCreneau(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(medecinCatalogueService.getProchainCreneau(id));
        } catch (ResponseStatusException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/catalogue/{id}")
    public ResponseEntity<Medecin> getCatalogueMedecin(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(medecinCatalogueService.getCatalogueMedecinPublic(id));
        } catch (ResponseStatusException e) {
            return ResponseEntity.notFound().build();
        }
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
