package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.RendezVousRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MedecinAccessService {

    private final MedecinRepository medecinRepository;
    private final RendezVousRepository rendezVousRepository;
    private final MedecinProfilBootstrapService medecinProfilBootstrapService;

    @Transactional(readOnly = true)
    public Optional<Medecin> resolveMedecinConnecte() {
        return currentEmail().flatMap(medecinRepository::findByUtilisateur_Email);
    }

    @Transactional(readOnly = true)
    public Medecin requireMedecinConnecte() {
        return resolveMedecinConnecte()
                .or(() -> currentEmail().flatMap(medecinProfilBootstrapService::creerFicheSiAbsente))
                .orElseThrow(() -> new IllegalArgumentException("Profil médecin introuvable pour ce compte"));
    }

    @Transactional(readOnly = true)
    public List<Patient> listerMesPatients() {
        Medecin m = requireMedecinConnecte();
        return rendezVousRepository.findDistinctPatientsByMedecinId(m.getId());
    }

    @Transactional(readOnly = true)
    public List<Patient> listerMesPatientsById(Long medecinId) {
        return rendezVousRepository.findDistinctPatientsByMedecinId(medecinId);
    }

    @Transactional(readOnly = true)
    public boolean medecinConcernePatient(Long medecinId, Long patientId) {
        return rendezVousRepository.existsByPatient_IdAndMedecin_Id(patientId, medecinId);
    }

    private Optional<String> currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        Object p = auth.getPrincipal();
        if (p instanceof String s && !s.isBlank()) {
            return Optional.of(s.trim().toLowerCase());
        }
        return Optional.empty();
    }
}
