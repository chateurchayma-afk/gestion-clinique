package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.PatientUpdateRequest;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.MethodeContact;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.Sexe;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final UtilisateurRepository utilisateurRepository;

    public PatientService(PatientRepository patientRepository,
                            UtilisateurRepository utilisateurRepository) {
        this.patientRepository = patientRepository;
        this.utilisateurRepository = utilisateurRepository;
    }

    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    public Patient getPatientById(Long id) {
        return patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient introuvable"));
    }

    public Patient savePatient(Patient patient) {
        return patientRepository.save(patient);
    }

    @Transactional
    public Patient updatePatient(Long id, PatientUpdateRequest req) {
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

        return patientRepository.save(patient);
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
