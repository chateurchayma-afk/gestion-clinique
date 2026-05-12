package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.UpdateProfileRequest;
import com.pfe.gestioncliniquebackend.dto.UtilisateurResponse;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;

    @Transactional(readOnly = true)
    public UtilisateurResponse getProfil(Long id) {
        Utilisateur user = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        return toResponse(user);
    }

    @Transactional
    public UtilisateurResponse updateProfil(Long id, UpdateProfileRequest request) {
        Utilisateur user = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        applyProfileFields(user, request);
        Utilisateur updatedUser = utilisateurRepository.save(user);
        return toResponse(updatedUser);
    }

    @Transactional(readOnly = true)
    public UtilisateurResponse getMe() {
        return toResponse(requireCurrentUtilisateur());
    }

    @Transactional
    public UtilisateurResponse updateMe(UpdateProfileRequest request) {
        Utilisateur user = requireCurrentUtilisateur();
        applyProfileFields(user, request);
        return toResponse(utilisateurRepository.save(user));
    }

    private Utilisateur requireCurrentUtilisateur() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof String email) || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide");
        }
        return utilisateurRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }

    private void applyProfileFields(Utilisateur user, UpdateProfileRequest request) {
        if (request.getNom() == null || request.getNom().trim().length() < 2) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (request.getPrenom() == null || request.getPrenom().trim().length() < 2) {
            throw new IllegalArgumentException("Le prénom est obligatoire");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }
        String newEmail = request.getEmail().trim().toLowerCase();
        if (!newEmail.equals(user.getEmail()) && utilisateurRepository.existsByEmailAndIdNot(newEmail, user.getId())) {
            throw new IllegalArgumentException("Cet email est déjà utilisé");
        }

        user.setNom(request.getNom().trim());
        user.setPrenom(request.getPrenom().trim());
        user.setEmail(newEmail);
        user.setTelephone(trimToNull(request.getTelephone()));
        user.setAdresse(trimToNull(request.getAdresse()));
        user.setVille(trimToNull(request.getVille()));
        user.setGouvernorat(trimToNull(request.getGouvernorat()));
        user.setCodePostal(trimToNull(request.getCodePostal()));

        if (request.getMotDePasse() != null && !request.getMotDePasse().isBlank()) {
            String pwd = request.getMotDePasse().trim();
            if (pwd.length() < 6) {
                throw new IllegalArgumentException("Le mot de passe doit contenir au moins 6 caractères");
            }
            user.setMotDePasse(pwd);
        }

        if (request.getActif() != null) {
            user.setActif(request.getActif());
        }
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static UtilisateurResponse toResponse(Utilisateur user) {
        return new UtilisateurResponse(
                user.getId(),
                user.getNom(),
                user.getPrenom(),
                user.getEmail(),
                user.getTelephone(),
                user.getAdresse(),
                user.getVille(),
                user.getGouvernorat(),
                user.getCodePostal(),
                user.getRole().name(),
                user.getActif()
        );
    }
}
