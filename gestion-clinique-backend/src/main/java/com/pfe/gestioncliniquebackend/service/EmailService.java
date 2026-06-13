package com.pfe.gestioncliniquebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.contact.recipient:CHATEUR.chayma@esprit.tn}")
    private String recipient;

    @Value("${spring.mail.username}")
    private String sender;

    public void sendContactEmail(String nom, String email, String sujet, String message) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(sender);
        mail.setTo(recipient);
        mail.setReplyTo(email);
        mail.setSubject("[MediChat Contact] " + sujet);
        mail.setText(
            "Nouveau message depuis le formulaire de contact MediChat\n\n" +
            "Nom    : " + nom + "\n" +
            "Email  : " + email + "\n" +
            "Sujet  : " + sujet + "\n\n" +
            "Message :\n" + message
        );
        mailSender.send(mail);
    }
}
