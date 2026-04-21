package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.RendezVousCreateRequest;
import com.pfe.gestioncliniquebackend.dto.RendezVousResponse;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.RendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.RendezVousRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RendezVousPatientService {

    private final RendezVousRepository rendezVousRepository;
    private final MedecinRepository medecinRepository;
    private final PatientAccessService patientAccessService;

    public List<RendezVousResponse> listerPourPatientConnecte() {
        Patient patient = patientAccessService.requireCurrentPatient();
        return rendezVousRepository.findAllByPatientIdOrdered(patient.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RendezVousResponse creer(RendezVousCreateRequest req) {
        Patient patient = patientAccessService.requireCurrentPatient();

        Medecin medecin = medecinRepository.findById(req.getMedecinId())
                .orElseThrow(() -> new IllegalArgumentException("Médecin introuvable"));
        if (medecin.getStatutValidation() != StatutValidationMedecin.VALIDE) {
            throw new IllegalArgumentException("Ce médecin n'est pas disponible pour la réservation");
        }
        if (Boolean.FALSE.equals(medecin.getDisponible())) {
            throw new IllegalArgumentException("Ce médecin n'accepte pas de nouveaux rendez-vous pour le moment");
        }

        LocalDate date = req.getDateRendezVous();
        if (date.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("La date du rendez-vous ne peut pas être dans le passé");
        }

        LocalTime debut = req.getHeureDebut();
        LocalTime fin = req.getHeureFin() != null ? req.getHeureFin() : debut.plusMinutes(30);
        if (!fin.isAfter(debut)) {
            throw new IllegalArgumentException("L'heure de fin doit être après l'heure de début");
        }

        if (date.equals(LocalDate.now())) {
            LocalDateTime limite = LocalDateTime.of(date, debut);
            if (limite.isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("L'heure choisie est déjà passée aujourd'hui");
            }
        }

        String motif = normalizeMotif(req.getMotif());

        if (rendezVousRepository.existsChevauchement(medecin.getId(), date, debut, fin, StatutRendezVous.ANNULE)) {
            throw new IllegalArgumentException(
                    "Ce créneau chevauche un autre rendez-vous. Choisissez une autre heure ou un autre jour.");
        }

        RendezVous rdv = RendezVous.builder()
                .patient(patient)
                .medecin(medecin)
                .dateRendezVous(date)
                .heureDebut(debut)
                .heureFin(fin)
                .modeConsultation(req.getModeConsultation())
                .motif(motif)
                .statut(StatutRendezVous.EN_ATTENTE)
                .build();

        return toResponse(rendezVousRepository.save(rdv));
    }

    @Transactional
    public RendezVousResponse annuler(Long rendezVousId) {
        Patient patient = patientAccessService.requireCurrentPatient();
        RendezVous rdv = rendezVousRepository.findByIdAndPatient_Id(rendezVousId, patient.getId())
                .orElseThrow(() -> new IllegalArgumentException("Rendez-vous introuvable"));

        if (rdv.getStatut() == StatutRendezVous.ANNULE) {
            throw new IllegalArgumentException("Ce rendez-vous est déjà annulé");
        }
        if (rdv.getStatut() == StatutRendezVous.TERMINE) {
            throw new IllegalArgumentException("Un rendez-vous terminé ne peut pas être annulé");
        }

        rdv.setStatut(StatutRendezVous.ANNULE);
        rdv.setAnnuleParPatient(true);
        return toResponse(rendezVousRepository.save(rdv));
    }

    private RendezVousResponse toResponse(RendezVous r) {
        Medecin m = r.getMedecin();
        String spec = m.getSpecialite() != null ? m.getSpecialite().getNom() : null;
        return RendezVousResponse.builder()
                .id(r.getId())
                .medecinId(m.getId())
                .medecinNom(m.getUtilisateur().getNom())
                .medecinPrenom(m.getUtilisateur().getPrenom())
                .specialiteNom(spec)
                .dateRendezVous(r.getDateRendezVous())
                .heureDebut(r.getHeureDebut())
                .heureFin(r.getHeureFin())
                .modeConsultation(r.getModeConsultation())
                .motif(r.getMotif())
                .statut(r.getStatut())
                .build();
    }

    private static String normalizeMotif(String motif) {
        if (motif == null) {
            return null;
        }
        String t = motif.trim();
        return t.isEmpty() ? null : t;
    }
}
