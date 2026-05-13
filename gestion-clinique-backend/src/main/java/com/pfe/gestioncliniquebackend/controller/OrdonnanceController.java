package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.OrdonnanceCreateRequest;
import com.pfe.gestioncliniquebackend.dto.OrdonnanceNotificationRequest;
import com.pfe.gestioncliniquebackend.dto.OrdonnanceResponse;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import com.pfe.gestioncliniquebackend.service.MedecinAccessService;
import com.pfe.gestioncliniquebackend.service.NotificationService;
import com.pfe.gestioncliniquebackend.service.OrdonnanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/ordonnances")
@RequiredArgsConstructor
public class OrdonnanceController {

    private final MedecinAccessService medecinAccessService;
    private final PatientRepository patientRepository;
    private final NotificationService notificationService;
    private final OrdonnanceService ordonnanceService;

    @PostMapping
    public OrdonnanceResponse create(@RequestBody OrdonnanceCreateRequest body) {
        return ordonnanceService.create(body);
    }

    @PostMapping("/notify")
    public ResponseEntity<?> notifyOrdonnance(@RequestBody OrdonnanceNotificationRequest body) {
        if (body == null || body.getPatientId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Patient requis"));
        }
        Medecin medecin = medecinAccessService.requireMedecinConnecte();
        Patient patient = patientRepository.findById(body.getPatientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));
        if (!medecinAccessService.medecinConcernePatient(medecin.getId(), patient.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces interdit");
        }

        String date = (body.getDateOrdonnance() == null || body.getDateOrdonnance().trim().isEmpty())
                ? LocalDate.now().toString()
                : body.getDateOrdonnance().trim();

        String patientName = patient.getUtilisateur().getPrenom() + " " + patient.getUtilisateur().getNom();
        String medecinName = medecin.getUtilisateur().getPrenom() + " " + medecin.getUtilisateur().getNom();

        notificationService.createForUser(
                patient.getUtilisateur(),
                NotificationType.ORDONNANCE_CREEE,
                "Ordonnance creee",
                "Une ordonnance a ete creee par Dr. " + medecinName + " le " + date + "."
        );
        notificationService.createForUser(
                medecin.getUtilisateur(),
                NotificationType.ORDONNANCE_CREEE,
                "Ordonnance creee",
                "Ordonnance creee pour " + patientName + " le " + date + "."
        );

        return ResponseEntity.ok().build();
    }
}
