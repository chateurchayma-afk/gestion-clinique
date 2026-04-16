package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.UpdateProfileRequest;
import com.pfe.gestioncliniquebackend.dto.UtilisateurResponse;
import com.pfe.gestioncliniquebackend.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    @GetMapping("/{id}")
    public UtilisateurResponse getProfil(@PathVariable Long id) {
        return utilisateurService.getProfil(id);
    }

    @PutMapping("/{id}")
    public UtilisateurResponse updateProfil(@PathVariable Long id,
                                            @RequestBody UpdateProfileRequest request) {
        return utilisateurService.updateProfil(id, request);
    }
}