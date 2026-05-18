package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.PatientUpdateRequest;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.MethodeContact;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.Sexe;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import com.pfe.gestioncliniquebackend.repository.RendezVousRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final RendezVousRepository rendezVousRepository;
    private final NotificationService notificationService;

    public PatientService(PatientRepository patientRepository,
                            UtilisateurRepository utilisateurRepository,
                            RendezVousRepository rendezVousRepository,
                            NotificationService notificationService) {
        this.patientRepository = patientRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.rendezVousRepository = rendezVousRepository;
        this.notificationService = notificationService;
    }

    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    public Patient getPatientById(Long id) {
        return patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient introuvable"));
    }

    public Patient savePatient(Patient patient) {
        Patient saved = patientRepository.save(patient);
        Utilisateur u = saved.getUtilisateur();
        if (u != null) {
            notificationService.createForUser(u, NotificationType.NOUVEAU_PATIENT,
                    "Bienvenue", "Votre compte patient a ete cree.");
        }
        return saved;
    }

    @Transactional
    public Patient updatePatient(Long id, PatientUpdateRequest req) {
        return updatePatient(id, req, false);
    }

    @Transactional
    public Patient updatePatient(Long id, PatientUpdateRequest req, boolean notifyLinkedMedecins) {
        if (req.getNom() == null || req.getNom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (req.getPrenom() == null || req.getPrenom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le prénom est obligatoire");
        }
        if (req.getEmail() == null || req.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }
        if (req.getTelephone() == null || req.getTelephone().trim().isEmpty()) {
            throw new IllegalArgumentException("Le téléphone est obligatoire");
        }

        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient introuvable"));
        if (patient.getUtilisateur() == null) {
            throw new IllegalArgumentException("Profil patient incomplet");
        }
        Utilisateur u = patient.getUtilisateur();
        if (u.getRole() != Role.PATIENT) {
            throw new IllegalArgumentException("Cet enregistrement n'est pas un patient");
        }

        String emailNorm = req.getEmail().trim().toLowerCase();
        if (utilisateurRepository.existsByEmailAndIdNot(emailNorm, u.getId())) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }

        String numeroDossier = normalizeOptional(req.getNumeroDossier());
        if (numeroDossier != null && patientRepository.existsByNumeroDossierAndIdNot(numeroDossier, id)) {
            throw new IllegalArgumentException("Numéro de dossier déjà utilisé");
        }

        Sexe sexeEnum = parseSexe(req.getSexe());
        MethodeContact methode = parseMethode(req.getMethodeContactPreferee());

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

        if (req.getMotDePasse() != null && !req.getMotDePasse().trim().isEmpty()) {
            if (req.getMotDePasse().trim().length() < 6) {
                throw new IllegalArgumentException("Le mot de passe doit contenir au moins 6 caractères");
            }
            u.setMotDePasse(req.getMotDePasse().trim());
        }

        utilisateurRepository.save(u);

        patient.setSituationMatrimoniale(normalizeOptional(req.getSituationMatrimoniale()));
        patient.setContactUrgenceNom(normalizeOptional(req.getContactUrgenceNom()));
        patient.setContactUrgenceTelephone(normalizeOptional(req.getContactUrgenceTelephone()));
        patient.setMethodeContactPreferee(methode);
        patient.setNumeroDossier(numeroDossier);

        Patient saved = patientRepository.save(patient);
        if (notifyLinkedMedecins) {
            notificationService.createForUser(
                    saved.getUtilisateur(),
                    NotificationType.PROFIL_MODIFIE,
                    "Profil modifié",
                    "Vos informations ont été mises à jour.");
            notifyLinkedMedecinsProfilUpdated(saved);
        } else {
            notificationService.createForUser(
                    saved.getUtilisateur(),
                    NotificationType.PROFIL_MODIFIE,
                    "Profil patient modifié",
                    "Les informations du patient ont été mises à jour.");
        }
        return saved;
    }

    private void notifyLinkedMedecinsProfilUpdated(Patient patient) {
        Utilisateur pu = patient.getUtilisateur();
        if (pu == null) {
            return;
        }
        String patientName = (pu.getPrenom() + " " + pu.getNom()).trim();
        if (patientName.isEmpty()) {
            patientName = "Un patient";
        }
        String message = patientName + " a mis à jour ses informations personnelles.";
        for (Medecin medecin : rendezVousRepository.findDistinctMedecinsByPatientId(patient.getId())) {
            Utilisateur mu = medecin.getUtilisateur();
            if (mu == null) {
                continue;
            }
            notificationService.createForUser(
                    mu,
                    NotificationType.PROFIL_MODIFIE,
                    "Profil patient modifié",
                    message);
        }
    }

    public void deletePatient(Long id) {
        patientRepository.deleteById(id);
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

    private static MethodeContact parseMethode(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        try {
            return MethodeContact.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Méthode de contact invalide");
        }
    }
}
