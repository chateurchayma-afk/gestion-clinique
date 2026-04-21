package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.AuthResponse;
import com.pfe.gestioncliniquebackend.dto.LoginRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinCreationRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterAdminRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterRequest;
import com.pfe.gestioncliniquebackend.entity.Administrateur;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.ServiceMedical;
import com.pfe.gestioncliniquebackend.entity.Specialite;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.MethodeContact;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.Sexe;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.AdministrateurRepository;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import com.pfe.gestioncliniquebackend.repository.ServiceMedicalRepository;
import com.pfe.gestioncliniquebackend.repository.SpecialiteRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import com.pfe.gestioncliniquebackend.security.JwtService;
import com.pfe.gestioncliniquebackend.util.ProfessionnelBio;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PatientRepository patientRepository;
    private final MedecinRepository medecinRepository;
    private final AdministrateurRepository administrateurRepository;
    private final SpecialiteRepository specialiteRepository;
    private final ServiceMedicalRepository serviceMedicalRepository;
    private final JwtService jwtService;

    public String registerPatient(RegisterRequest request) {
        if (request.getNom() == null || request.getNom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (request.getPrenom() == null || request.getPrenom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le prénom est obligatoire");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }
        if (request.getMotDePasse() == null || request.getMotDePasse().trim().isEmpty()) {
            throw new IllegalArgumentException("Le mot de passe est obligatoire");
        }
        if (request.getTelephone() == null || request.getTelephone().trim().isEmpty()) {
            throw new IllegalArgumentException("Le téléphone est obligatoire");
        }

        String emailNorm = request.getEmail().trim().toLowerCase();
        if (utilisateurRepository.existsByEmail(emailNorm)) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }

        String numeroDossier = normalizeOptional(request.getNumeroDossier());
        if (numeroDossier != null && patientRepository.existsByNumeroDossier(numeroDossier)) {
            throw new IllegalArgumentException("Numéro de dossier déjà utilisé");
        }

        Sexe sexeEnum = null;
        if (request.getSexe() != null && !request.getSexe().trim().isEmpty()) {
            try {
                sexeEnum = Sexe.valueOf(request.getSexe().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Sexe invalide");
            }
        }

        MethodeContact methode = null;
        if (request.getMethodeContactPreferee() != null && !request.getMethodeContactPreferee().trim().isEmpty()) {
            try {
                methode = MethodeContact.valueOf(request.getMethodeContactPreferee().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Méthode de contact invalide");
            }
        }

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom().trim())
                .prenom(request.getPrenom().trim())
                .email(emailNorm)
                .motDePasse(request.getMotDePasse().trim())
                .telephone(request.getTelephone().trim())
                .adresse(normalizeOptional(request.getAdresse()))
                .ville(normalizeOptional(request.getVille()))
                .gouvernorat(normalizeOptional(request.getGouvernorat()))
                .codePostal(normalizeOptional(request.getCodePostal()))
                .dateNaissance(request.getDateNaissance())
                .sexe(sexeEnum)
                .photo(normalizeOptional(request.getPhoto()))
                .role(Role.PATIENT)
                .actif(true)
                .build();

        Utilisateur savedUser = utilisateurRepository.save(user);

        Patient patient = Patient.builder()
                .utilisateur(savedUser)
                .situationMatrimoniale(normalizeOptional(request.getSituationMatrimoniale()))
                .contactUrgenceNom(normalizeOptional(request.getContactUrgenceNom()))
                .contactUrgenceTelephone(normalizeOptional(request.getContactUrgenceTelephone()))
                .methodeContactPreferee(methode)
                .numeroDossier(numeroDossier)
                .build();

        patientRepository.save(patient);

        return "Patient créé avec succès";
    }

    public String registerMedecin(RegisterRequest request) {
        String emailNorm = request.getEmail().trim().toLowerCase();
        if (utilisateurRepository.existsByEmail(emailNorm)) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom().trim())
                .prenom(request.getPrenom().trim())
                .email(emailNorm)
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone() != null ? request.getTelephone().trim() : null)
                .role(Role.MEDECIN)
                .actif(true)
                .build();

        Utilisateur savedUser = utilisateurRepository.save(user);

        Specialite specialite = null;
        if (request.getSpecialiteId() != null) {
            specialite = specialiteRepository.findById(request.getSpecialiteId())
                    .orElseThrow(() -> new IllegalArgumentException("Spécialité introuvable"));
        }

        Medecin medecin = Medecin.builder()
                .utilisateur(savedUser)
                .specialite(specialite)
                .statutValidation(StatutValidationMedecin.EN_ATTENTE)
                .disponible(true)
                .build();

        medecinRepository.save(medecin);

        return "Médecin créé avec succès";
    }

    public String registerMedecinComplet(MedecinCreationRequest request) {
        String emailNorm = request.getEmail().trim().toLowerCase();
        if (utilisateurRepository.existsByEmail(emailNorm)) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }

        // Validation supplémentaire pour éviter les chaînes vides
        if (request.getNom() == null || request.getNom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (request.getPrenom() == null || request.getPrenom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le prénom est obligatoire");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }
        if (request.getMotDePasse() == null || request.getMotDePasse().trim().isEmpty()) {
            throw new IllegalArgumentException("Le mot de passe est obligatoire");
        }
        if (request.getTelephone() == null || request.getTelephone().trim().isEmpty()) {
            throw new IllegalArgumentException("Le téléphone est obligatoire");
        }

        Sexe sexeEnum = null;
        if (request.getSexe() != null && !request.getSexe().trim().isEmpty()) {
            try {
                sexeEnum = Sexe.valueOf(request.getSexe().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Sexe invalide");
            }
        }

        Specialite specialite = null;
        if (request.getSpecialiteId() != null) {
            specialite = specialiteRepository.findById(request.getSpecialiteId())
                    .orElseThrow(() -> new IllegalArgumentException("Spécialité introuvable"));
        }

        ServiceMedical serviceMedical = null;
        if (request.getServiceMedicalId() != null) {
            serviceMedical = serviceMedicalRepository.findById(request.getServiceMedicalId())
                    .orElseThrow(() -> new IllegalArgumentException("Service médical introuvable"));
        }

        String biographie = ProfessionnelBio.merge(
                request.getBiographie(),
                request.getQualifications(),
                request.getFormation(),
                request.getCertifications(),
                request.getDepartement(),
                request.getPosition()
        );

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom().trim())
                .prenom(request.getPrenom().trim())
                .email(emailNorm)
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone().trim())
                .adresse(normalizeOptional(request.getAdresse()))
                .ville(normalizeOptional(request.getVille()))
                .gouvernorat(normalizeOptional(request.getGouvernorat()))
                .codePostal(normalizeOptional(request.getCodePostal()))
                .dateNaissance(request.getDateNaissance())
                .sexe(sexeEnum)
                .photo(normalizeOptional(request.getPhoto()))
                .role(Role.MEDECIN)
                .actif(true)
                .build();

        Utilisateur savedUser = utilisateurRepository.save(user);

        Medecin medecin = Medecin.builder()
                .utilisateur(savedUser)
                .experienceAnnees(request.getExperienceAnnees())
                .matricule(normalizeOptional(request.getMatricule()))
                .biographie(biographie)
                .statutValidation(StatutValidationMedecin.EN_ATTENTE)
                .disponible(request.getDisponible() != null ? request.getDisponible() : true)
                .specialite(specialite)
                .serviceMedical(serviceMedical)
                .build();

        medecinRepository.save(medecin);

        return "Médecin créé avec succès";
    }

    @Transactional(rollbackFor = Exception.class)
    public String registerAdmin(RegisterAdminRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("L'email est obligatoire");
        }
        String emailNorm = request.getEmail().trim().toLowerCase();
        if (utilisateurRepository.existsByEmail(emailNorm)) {
            throw new IllegalArgumentException(
                    "Cet email est déjà utilisé. Connectez-vous ou choisissez un autre email.");
        }
        if (request.getNom() == null || request.getNom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (request.getPrenom() == null || request.getPrenom().trim().isEmpty()) {
            throw new IllegalArgumentException("Le prénom est obligatoire");
        }
        if (request.getMotDePasse() == null || request.getMotDePasse().trim().isEmpty()) {
            throw new IllegalArgumentException("Le mot de passe est obligatoire");
        }

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom().trim())
                .prenom(request.getPrenom().trim())
                .email(emailNorm)
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone() != null ? request.getTelephone().trim() : null)
                .role(Role.ADMIN)
                .actif(true)
                .build();

        Utilisateur saved = utilisateurRepository.save(user);

        Administrateur administrateur = Administrateur.builder()
                .utilisateur(saved)
                .fonction(null)
                .build();
        administrateurRepository.save(administrateur);

        return "Administrateur créé avec succès";
    }

    public AuthResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return new AuthResponse("Email incorrect", null, null, null, null, null, null);
        }
        String emailNorm = request.getEmail().trim().toLowerCase();
        Optional<Utilisateur> userOptional = utilisateurRepository.findByEmail(emailNorm);

        if (userOptional.isEmpty()) {
            return new AuthResponse("Email incorrect", null, null, null, null, null, null);
        }

        Utilisateur user = userOptional.get();

        String pwdRequest = request.getMotDePasse() != null ? request.getMotDePasse() : "";
        if (!user.getMotDePasse().equals(pwdRequest)) {
            return new AuthResponse("Mot de passe incorrect", null, null, null, null, null, null);
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

        return new AuthResponse(
                "Connexion réussie",
                token,
                user.getRole().name(),
                user.getEmail(),
                user.getId(),
                user.getNom(),
                user.getPrenom()
        );
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}