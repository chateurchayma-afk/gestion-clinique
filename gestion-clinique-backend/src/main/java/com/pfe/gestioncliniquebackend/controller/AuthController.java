package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.AuthResponse;
import com.pfe.gestioncliniquebackend.dto.LoginRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterRequest;
import com.pfe.gestioncliniquebackend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register-patient")
    public String registerPatient(@RequestBody RegisterRequest request) {
        return authService.registerPatient(request);
    }

    @PostMapping("/register-medecin")
    public String registerMedecin(@RequestBody RegisterRequest request) {
        return authService.registerMedecin(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }
}