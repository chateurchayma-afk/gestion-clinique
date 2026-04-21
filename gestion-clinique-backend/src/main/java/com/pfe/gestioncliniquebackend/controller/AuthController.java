package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.AuthResponse;
import com.pfe.gestioncliniquebackend.dto.LoginRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinCreationRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterAdminRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterRequest;
import com.pfe.gestioncliniquebackend.service.AuthService;
import org.springframework.dao.DataIntegrityViolationException;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register-patient")
    public ResponseEntity<String> registerPatient(@Valid @RequestBody RegisterRequest request) {
        try {
            String result = authService.registerPatient(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/register-medecin")
    public ResponseEntity<String> registerMedecin(@Valid @RequestBody MedecinCreationRequest request) {
        try {
            String result = authService.registerMedecinComplet(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/register-admin")
    public ResponseEntity<String> registerAdmin(@RequestBody RegisterAdminRequest request) {
        try {
            String result = authService.registerAdmin(request);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            Throwable t = e;
            while (t != null) {
                if (t instanceof DataIntegrityViolationException dive) {
                    String msg = dive.getMostSpecificCause() != null
                            ? dive.getMostSpecificCause().getMessage()
                            : dive.getMessage();
                    return ResponseEntity.badRequest().body(
                            "Conflit en base (email déjà pris, table admin, etc.). "
                                    + (msg != null ? msg : ""));
                }
                t = t.getCause();
            }
            return ResponseEntity.badRequest().body(
                    e.getMessage() != null ? e.getMessage() : "Erreur lors de la création de l'administrateur");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            if ("Connexion réussie".equals(response.getMessage())) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new AuthResponse(e.getMessage(), null, null, null, null, null, null));
        }
    }
}