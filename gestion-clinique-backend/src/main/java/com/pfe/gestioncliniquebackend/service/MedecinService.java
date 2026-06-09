package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.MedecinFullUpdateRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinValidationRequest;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Specialite;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.Sexe;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.SpecialiteRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import com.pfe.gestioncliniquebackend.util.ProfessionnelBio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MedecinService {

    private final MedecinRepository medecinRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final SpecialiteRepository specialiteRepository;
    private final NotificationService notificationService;
    

    public List<Medecin> getAllMedecins() {
        return medecinRepository.findAll();
    }

    public Medecin getMedecinById(Long id) {
        return medecinRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Médecin introuvable"));
    }

    public List<Medecin> getMedecinsEnAttente() {
        return medecinRepository.findPendingValidationWithDetails(StatutValidationMedecin.EN_ATTENTE);
    }

    @Transactional
    public Medecin updateStatutValidation(Long id, MedecinValidationRequest request) {
        if (request.getStatut() == null || request.getStatut().trim().isEmpty()) {
            throw new IllegalArgumentException("Le statut est obligatoire");
        }
        StatutValidationMedecin nouveau;
        try {
            nouveau = StatutValidationMedecin.valueOf(request.getStatut().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Statut invalide (VALIDE ou REFUSE attendu pour cette action)");
        }
        if (nouveau != StatutValidationMedecin.VALIDE && nouveau != StatutValidationMedecin.REFUSE) {
            throw new IllegalArgumentException("Seuls VALIDE et REFUSE sont autorisés pour la validation");
        }

        Medecin medecin = medecinRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Médecin introuvable"));

        StatutValidationMedecin actuel = medecin.getStatutValidation();
        if (actuel != null && actuel != StatutValidationMedecin.EN_ATTENTE) {
            throw new IllegalArgumentException("Ce médecin n'est plus en attente de validation");
        }

        medecin.setStatutValidation(nouveau);
        Medecin saved = medecinRepository.save(medecin);

        String nomComplet = "Dr. " + medecin.getUtilisateur().getPrenom() + " " + medecin.getUtilisateur().getNom();
        if (nouveau == StatutValidationMedecin.VALIDE) {
            notificationService.createForUser(
                    medecin.getUtilisateur(),
                    NotificationType.ALERTE_SYSTEME,
                    "Compte validé",
                    "Votre compte médecin a été validé. Vous pouvez maintenant vous connecter et accéder à votre espace."
            );
        } else if (nouveau == StatutValidationMedecin.REFUSE) {
            notificationService.createForUser(
                    medecin.getUtilisateur(),
                    NotificationType.ALERTE_SYSTEME,
                    "Compte refusé",
                    "Votre demande d'inscription a été refusée. Veuillez contacter l'administrateur pour plus d'informations."
            );
        }
        return saved;
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


        Medecin medecin = Medecin.builder()
                .utilisateur(utilisateur)
                .experienceAnnees(request.getExperienceAnnees())
                .matricule(request.getMatricule())
                .biographie(request.getBiographie())
                .statutValidation(StatutValidationMedecin.EN_ATTENTE)
                .disponible(request.getDisponible() != null ? request.getDisponible() : true)
                .specialite(specialite)
                .build();

        return medecinRepository.save(medecin);
    }

    @Transactional
    public Medecin updateMedecin(Long id, MedecinFullUpdateRequest req) {
        Medecin medecin = medecinRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Médecin introuvable"));
        Utilisateur u = medecin.getUtilisateur();
        if (u.getRole() != Role.MEDECIN) {
            throw new IllegalArgumentException("Cet enregistrement n'est pas un médecin");
        }

        String emailNorm = req.getEmail().trim().toLowerCase();
        if (utilisateurRepository.existsByEmailAndIdNot(emailNorm, u.getId())) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }

        if (req.getMotDePasse() != null && !req.getMotDePasse().trim().isEmpty()) {
            if (req.getMotDePasse().trim().length() < 6) {
                throw new IllegalArgumentException("Le mot de passe doit contenir au moins 6 caractères");
            }
            u.setMotDePasse(req.getMotDePasse().trim());
        }

        Sexe sexeEnum = parseSexe(req.getSexe());

        u.setNom(req.getNom().trim());
        u.setPrenom(req.getPrenom().trim());
        u.setEmail(emailNorm);
        u.setTelephone(req.getTelephone().trim());
        u.setAdresse(normalizeOptional(req.getAdresse()));
        u.setVille(normalizeOptional(req.getVille()));
        u.setGouvernorat(normalizeOptional(req.getGouvernorat()));
        u.setCodePostal(normalizeOptional(req.getCodePostal()));
        u.setDateNaissance(req.getDateNaissance());
        u.setSexe(sexeEnum);
        u.setPhoto(normalizeOptional(req.getPhoto()));

        utilisateurRepository.save(u);

        if (req.getSpecialiteId() != null) {
            Specialite specialite = specialiteRepository.findById(req.getSpecialiteId())
                    .orElseThrow(() -> new IllegalArgumentException("Spécialité introuvable"));
            medecin.setSpecialite(specialite);
        } else {
            medecin.setSpecialite(null);
        }

        

        medecin.setExperienceAnnees(req.getExperienceAnnees());
        medecin.setMatricule(normalizeOptional(req.getMatricule()));
        medecin.setBiographie(ProfessionnelBio.merge(
                req.getBiographie(),
                req.getQualifications(),
                req.getFormation(),
                req.getCertifications(),
                req.getDepartement(),
                req.getPosition()
        ));
        if (req.getDisponible() != null) {
            medecin.setDisponible(req.getDisponible());
        }
        medecin.setPrixConsultation(req.getPrixConsultation());

        return medecinRepository.save(medecin);
    }

    public void deleteMedecin(Long id) {
        medecinRepository.deleteById(id);
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    private static Sexe parseSexe(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        try {
            return Sexe.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Sexe invalide");
        }
    }
}
