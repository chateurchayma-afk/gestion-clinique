package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.UpdateProfileRequest;
import com.pfe.gestioncliniquebackend.dto.UtilisateurResponse;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;

    public UtilisateurResponse getProfil(Long id) {
        Utilisateur user = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

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

    public UtilisateurResponse updateProfil(Long id, UpdateProfileRequest request) {
        Utilisateur user = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setEmail(request.getEmail());
        user.setTelephone(request.getTelephone());
        user.setAdresse(request.getAdresse());
        user.setVille(request.getVille());
        user.setGouvernorat(request.getGouvernorat());
        user.setCodePostal(request.getCodePostal());

        Utilisateur updatedUser = utilisateurRepository.save(user);

        return new UtilisateurResponse(
                updatedUser.getId(),
                updatedUser.getNom(),
                updatedUser.getPrenom(),
                updatedUser.getEmail(),
                updatedUser.getTelephone(),
                updatedUser.getAdresse(),
                updatedUser.getVille(),
                updatedUser.getGouvernorat(),
                updatedUser.getCodePostal(),
                updatedUser.getRole().name(),
                updatedUser.getActif()
        );
    }
}