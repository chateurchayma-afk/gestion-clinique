package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.AuthResponse;
import com.pfe.gestioncliniquebackend.dto.LoginRequest;
import com.pfe.gestioncliniquebackend.dto.MedecinCreationRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterRequest;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.ServiceMedical;
import com.pfe.gestioncliniquebackend.entity.Specialite;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.Sexe;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import com.pfe.gestioncliniquebackend.repository.ServiceMedicalRepository;
import com.pfe.gestioncliniquebackend.repository.SpecialiteRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import com.pfe.gestioncliniquebackend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PatientRepository patientRepository;
    private final MedecinRepository medecinRepository;
    private final SpecialiteRepository specialiteRepository;
    private final ServiceMedicalRepository serviceMedicalRepository;
    private final JwtService jwtService;

    public String registerPatient(RegisterRequest request) {
        if (utilisateurRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom().trim())
                .prenom(request.getPrenom().trim())
                .email(request.getEmail().trim().toLowerCase())
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone() != null ? request.getTelephone().trim() : null)
                .role(Role.PATIENT)
                .actif(true)
                .build();

        Utilisateur savedUser = utilisateurRepository.save(user);

        Patient patient = Patient.builder()
                .utilisateur(savedUser)
                .build();

        patientRepository.save(patient);

        return "Patient créé avec succès";
    }

    public String registerMedecin(RegisterRequest request) {
        if (utilisateurRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email déjà utilisé");
        }

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom().trim())
                .prenom(request.getPrenom().trim())
                .email(request.getEmail().trim().toLowerCase())
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone() != null ? request.getTelephone().trim() : null)
                .role(Role.MEDECIN)
                .actif(true)
                .build();

        Utilisateur savedUser = utilisateurRepository.save(user);

        Medecin medecin = Medecin.builder()
                .utilisateur(savedUser)
                .build();

        medecinRepository.save(medecin);

        return "Médecin créé avec succès";
    }

    public String registerMedecinComplet(MedecinCreationRequest request) {
        if (utilisateurRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
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
                sexeEnum = Sexe.valueOf(request.getSexe().toUpperCase());
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

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom().trim())
                .prenom(request.getPrenom().trim())
                .email(request.getEmail().trim().toLowerCase())
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone().trim())
                .adresse(request.getAdresse() != null ? request.getAdresse().trim() : null)
                .ville(request.getVille() != null ? request.getVille().trim() : null)
                .gouvernorat(request.getGouvernorat() != null ? request.getGouvernorat().trim() : null)
                .codePostal(request.getCodePostal() != null ? request.getCodePostal().trim() : null)
                .dateNaissance(request.getDateNaissance())
                .sexe(sexeEnum)
                .role(Role.MEDECIN)
                .actif(true)
                .build();

        Utilisateur savedUser = utilisateurRepository.save(user);

        Medecin medecin = Medecin.builder()
                .utilisateur(savedUser)
                .experienceAnnees(request.getExperienceAnnees())
                .matricule(request.getMatricule() != null ? request.getMatricule().trim() : null)
                .biographie(request.getBiographie() != null ? request.getBiographie().trim() : null)
                .statutValidation(StatutValidationMedecin.EN_ATTENTE)
                .disponible(request.getDisponible() != null ? request.getDisponible() : true)
                .specialite(specialite)
                .serviceMedical(serviceMedical)
                .build();

        medecinRepository.save(medecin);

        return "Médecin créé avec succès";
    }

    public AuthResponse login(LoginRequest request) {
        Optional<Utilisateur> userOptional = utilisateurRepository.findByEmail(request.getEmail());

        if (userOptional.isEmpty()) {
            return new AuthResponse("Email incorrect", null, null, null);
        }

        Utilisateur user = userOptional.get();

        if (!user.getMotDePasse().equals(request.getMotDePasse())) {
            return new AuthResponse("Mot de passe incorrect", null, null, null);
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

        return new AuthResponse(
                "Connexion réussie",
                token,
                user.getRole().name(),
                user.getEmail()
        );
    }
}