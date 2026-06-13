package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.ContactRequest;
import com.pfe.gestioncliniquebackend.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contact")
@RequiredArgsConstructor
public class ContactController {

    private final EmailService emailService;

    @PostMapping
    public ResponseEntity<String> sendMessage(@RequestBody ContactRequest request) {
        try {
            emailService.sendContactEmail(
                request.getNom(),
                request.getEmail(),
                request.getSujet(),
                request.getMessage()
            );
            return ResponseEntity.ok("Message envoyé avec succès");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de l'envoi du message");
        }
    }
}
