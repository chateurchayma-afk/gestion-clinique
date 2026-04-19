package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PatientAccessService {

    private final PatientRepository patientRepository;

    /**
     * Patient connecté (JWT) — email dans le contexte Spring Security.
     */
    public Patient requireCurrentPatient() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof String email) || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide");
        }
        Patient patient = patientRepository.findByUtilisateur_Email(email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Espace réservé aux patients"));
        if (patient.getUtilisateur().getRole() != Role.PATIENT) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Espace réservé aux patients");
        }
        return patient;
    }
}
