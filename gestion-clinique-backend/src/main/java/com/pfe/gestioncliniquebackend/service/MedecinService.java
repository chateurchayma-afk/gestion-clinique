package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.MedecinRequest;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.ServiceMedical;
import com.pfe.gestioncliniquebackend.entity.Specialite;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.ServiceMedicalRepository;
import com.pfe.gestioncliniquebackend.repository.SpecialiteRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MedecinService {

    private final MedecinRepository medecinRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final SpecialiteRepository specialiteRepository;
    private final ServiceMedicalRepository serviceMedicalRepository;

    public List<Medecin> getAllMedecins() {
        return medecinRepository.findAll();
    }

    public Medecin ajouterMedecinComplet(MedecinRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findById(request.getUtilisateurId())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        if (utilisateur.getRole() != Role.MEDECIN) {
            throw new RuntimeException("Cet utilisateur n'est pas un médecin");
        }

        if (medecinRepository.findByUtilisateurId(utilisateur.getId()).isPresent()) {
            throw new RuntimeException("Le médecin existe déjà pour cet utilisateur");
        }

        Specialite specialite = null;
        if (request.getSpecialiteId() != null) {
            specialite = specialiteRepository.findById(request.getSpecialiteId())
                    .orElseThrow(() -> new RuntimeException("Spécialité introuvable"));
        }

        ServiceMedical serviceMedical = null;
        if (request.getServiceMedicalId() != null) {
            serviceMedical = serviceMedicalRepository.findById(request.getServiceMedicalId())
                    .orElseThrow(() -> new RuntimeException("Service médical introuvable"));
        }

        Medecin medecin = Medecin.builder()
                .utilisateur(utilisateur)
                .experienceAnnees(request.getExperienceAnnees())
                .matricule(request.getMatricule())
                .biographie(request.getBiographie())
                .statutValidation(StatutValidationMedecin.EN_ATTENTE)
                .disponible(request.getDisponible() != null ? request.getDisponible() : true)
                .specialite(specialite)
                .serviceMedical(serviceMedical)
                .build();

        return medecinRepository.save(medecin);
    }

    public Medecin updateMedecin(Long id, MedecinRequest request) {

    Medecin medecin = medecinRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Médecin introuvable"));

    if (request.getExperienceAnnees() != null) {
        medecin.setExperienceAnnees(request.getExperienceAnnees());
    }

    if (request.getMatricule() != null) {
        medecin.setMatricule(request.getMatricule());
    }

    if (request.getBiographie() != null) {
        medecin.setBiographie(request.getBiographie());
    }

    if (request.getDisponible() != null) {
        medecin.setDisponible(request.getDisponible());
    }

    if (request.getSpecialiteId() != null) {
        Specialite specialite = specialiteRepository.findById(request.getSpecialiteId())
                .orElseThrow(() -> new RuntimeException("Spécialité introuvable"));
        medecin.setSpecialite(specialite);
    }

    if (request.getServiceMedicalId() != null) {
        ServiceMedical serviceMedical = serviceMedicalRepository.findById(request.getServiceMedicalId())
                .orElseThrow(() -> new RuntimeException("Service médical introuvable"));
        medecin.setServiceMedical(serviceMedical);
    }

    return medecinRepository.save(medecin);
    }

    public void deleteMedecin(Long id) {
        medecinRepository.deleteById(id);
    }
}