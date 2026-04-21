package com.pfe.gestioncliniquebackend.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.pfe.gestioncliniquebackend.dto.AuthResponse;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.MethodeContact;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import com.pfe.gestioncliniquebackend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final PatientRepository patientRepository;
    private final JwtService jwtService;

    @Value("${google.client.id}")
    private String googleClientId;

    /**
     * Vérifie et traite l'authentification Google
     */
    @Transactional
    public AuthResponse authenticateWithGoogle(String googleToken) throws GeneralSecurityException, IOException {
        String audience = googleClientId != null ? googleClientId.trim() : "";
        if (audience.isEmpty()) {
            throw new IllegalStateException(
                    "GOOGLE_CLIENT_ID / google.client.id est vide. Vérifie gestion-clinique-backend/.env ou la variable d'environnement."
            );
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        )
                .setAudience(Collections.singletonList(audience))
                .build();

        GoogleIdToken idToken = verifier.verify(googleToken);
        if (idToken == null) {
            throw new SecurityException(
                    "Token Google refusé (audience ou signature). Vérifie que GOOGLE_CLIENT_ID est identique au client ID Angular."
            );
        }

        GoogleIdToken.Payload payload = idToken.getPayload();

        String email = payload.getEmail();
        String firstName = (String) payload.get("given_name");
        String lastName = (String) payload.get("family_name");

        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email non disponible dans le token Google");
        }

        String emailNorm = email.trim().toLowerCase();

        Optional<Utilisateur> existingUser = utilisateurRepository.findByEmail(emailNorm);
        Utilisateur user;

        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            user = Utilisateur.builder()
                    .email(emailNorm)
                    .nom(lastName != null ? lastName.trim() : "")
                    .prenom(firstName != null ? firstName.trim() : "")
                    .motDePasse("")
                    .role(Role.PATIENT)
                    .actif(true)
                    .dateCreation(LocalDateTime.now())
                    .dateModification(LocalDateTime.now())
                    .build();

            user = utilisateurRepository.save(user);

            Patient patient = Patient.builder()
                    .utilisateur(user)
                    .numeroDossier(null)
                    .situationMatrimoniale(null)
                    .methodeContactPreferee(MethodeContact.EMAIL)
                    .build();

            patientRepository.save(patient);
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
}
