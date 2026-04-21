package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.AuthResponse;
import com.pfe.gestioncliniquebackend.dto.GoogleAuthRequest;
import com.pfe.gestioncliniquebackend.dto.LoginRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinCreationRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterAdminRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterRequest;
import com.pfe.gestioncliniquebackend.service.AuthService;
import com.pfe.gestioncliniquebackend.service.GoogleAuthService;
import org.springframework.dao.DataIntegrityViolationException;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;

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

    /**
     * Endpoint pour l'authentification Google OAuth
     * POST /api/auth/google
     * Body: { "token": "google_id_token" }
     */
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> authenticateGoogle(@RequestBody GoogleAuthRequest request) {
        try {
            if (request.getToken() == null || request.getToken().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(new AuthResponse());
            }

            AuthResponse response = googleAuthService.authenticateWithGoogle(request.getToken());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new AuthResponse(e.getMessage(), null, null, null, null, null, null));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new AuthResponse(e.getMessage(), null, null, null, null, null, null));
        } catch (SecurityException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Token Google invalide";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(msg, null, null, null, null, null, null));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new AuthResponse());
        }
    }
}