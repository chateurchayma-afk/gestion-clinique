package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.AuthResponse;
import com.pfe.gestioncliniquebackend.dto.LoginRequest;
import com.pfe.gestioncliniquebackend.dto.RegisterRequest;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
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
    private final JwtService jwtService;

    public String registerPatient(RegisterRequest request) {
        if (utilisateurRepository.existsByEmail(request.getEmail())) {
            return "Email déjà utilisé";
        }

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone())
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
            return "Email déjà utilisé";
        }

        Utilisateur user = Utilisateur.builder()
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .motDePasse(request.getMotDePasse())
                .telephone(request.getTelephone())
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