package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.OrdonnanceCreateRequest;
import com.pfe.gestioncliniquebackend.dto.OrdonnanceResponse;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Ordonnance;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.repository.OrdonnanceRepository;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class OrdonnanceService {

    private final OrdonnanceRepository ordonnanceRepository;
    private final PatientRepository patientRepository;
    private final MedecinAccessService medecinAccessService;
    private final NotificationService notificationService;

    @Transactional
    public OrdonnanceResponse create(OrdonnanceCreateRequest body) {
        if (body == null || body.getPatientId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patient requis");
        }
        Medecin medecin = medecinAccessService.requireMedecinConnecte();
        Patient patient = patientRepository.findById(body.getPatientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));
        if (!medecinAccessService.medecinConcernePatient(medecin.getId(), patient.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces interdit");
        }

        Ordonnance ordonnance = Ordonnance.builder()
                .medecin(medecin)
                .patient(patient)
                .dateOrdonnance(body.getDateOrdonnance())
                .medicamentsText(trim(body.getMedicamentsText()))
                .qrUrl(trim(body.getQrUrl()))
                .build();

        Ordonnance saved = ordonnanceRepository.save(ordonnance);

        String date = body.getDateOrdonnance() == null ? LocalDate.now().toString() : body.getDateOrdonnance().toString();
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

        return new OrdonnanceResponse(
                saved.getId(),
                patient.getId(),
                medecin.getId(),
                saved.getDateOrdonnance(),
                saved.getCreatedAt()
        );
    }

    private static String trim(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
