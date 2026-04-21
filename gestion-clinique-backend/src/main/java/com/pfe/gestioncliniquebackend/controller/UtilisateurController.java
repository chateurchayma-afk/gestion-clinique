package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.UpdateProfileRequest;
import com.pfe.gestioncliniquebackend.dto.UtilisateurResponse;
import com.pfe.gestioncliniquebackend.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    @GetMapping("/me")
    public UtilisateurResponse getMe() {
        return utilisateurService.getMe();
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody UpdateProfileRequest request) {
        try {
            return ResponseEntity.ok(utilisateurService.updateMe(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public UtilisateurResponse getProfil(@PathVariable Long id) {
        return utilisateurService.getProfil(id);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfil(@PathVariable Long id, @RequestBody UpdateProfileRequest request) {
        try {
            return ResponseEntity.ok(utilisateurService.updateProfil(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}