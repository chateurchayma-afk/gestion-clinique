package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Crée une fiche {@link Medecin} minimale si l’utilisateur a le rôle MEDECIN mais aucune ligne
 * {@code medecin} (comptes incomplets ou données migrées).
 */
@Service
@RequiredArgsConstructor
public class MedecinProfilBootstrapService {

    private final UtilisateurRepository utilisateurRepository;
    private final MedecinRepository medecinRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<Medecin> creerFicheSiAbsente(String emailNormalise) {
        if (emailNormalise == null || emailNormalise.isBlank()) {
            return Optional.empty();
        }
        String email = emailNormalise.trim().toLowerCase();
        Optional<Utilisateur> uOpt = utilisateurRepository.findByEmail(email);
        if (uOpt.isEmpty()) {
            return Optional.empty();
        }
        Utilisateur u = uOpt.get();
        if (u.getRole() != Role.MEDECIN) {
            return Optional.empty();
        }
        Optional<Medecin> existing = medecinRepository.findByUtilisateurId(u.getId());
        if (existing.isPresent()) {
            return existing;
        }
        Medecin m =
                Medecin.builder()
                        .utilisateur(u)
                        .statutValidation(StatutValidationMedecin.EN_ATTENTE)
                        .disponible(true)
                        .build();
        return Optional.of(medecinRepository.save(m));
    }
}
