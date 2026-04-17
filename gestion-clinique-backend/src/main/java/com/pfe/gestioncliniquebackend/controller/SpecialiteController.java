package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.entity.Specialite;
import com.pfe.gestioncliniquebackend.service.SpecialiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/specialites")
@RequiredArgsConstructor
public class SpecialiteController {

    private final SpecialiteService specialiteService;

    @GetMapping
    public List<Specialite> getAllSpecialites() {
        return specialiteService.getAllSpecialites();
    }

    @PostMapping
    public Specialite ajouterSpecialite(@RequestBody Specialite specialite) {
        return specialiteService.addSpecialite(specialite);
    }

    @DeleteMapping("/{id}")
    public void supprimerSpecialite(@PathVariable Long id) {
        specialiteService.deleteSpecialite(id);
    }
}