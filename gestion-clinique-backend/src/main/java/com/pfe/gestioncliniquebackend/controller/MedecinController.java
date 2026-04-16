package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.MedecinRequest;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.service.MedecinService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medecins")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class MedecinController {

    private final MedecinService medecinService;

    @GetMapping
    public List<Medecin> getAllMedecins() {
        return medecinService.getAllMedecins();
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
    public Medecin updateMedecin(@PathVariable Long id, @RequestBody MedecinRequest request) {
        return medecinService.updateMedecin(id, request);
    }
}