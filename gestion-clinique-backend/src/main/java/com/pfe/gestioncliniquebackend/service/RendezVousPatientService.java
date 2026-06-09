package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.RendezVousCreateRequest;
import com.pfe.gestioncliniquebackend.dto.RendezVousReporterRequest;
import com.pfe.gestioncliniquebackend.dto.RendezVousResponse;
import com.pfe.gestioncliniquebackend.entity.Disponibilite;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.RendezVous;
import com.pfe.gestioncliniquebackend.enums.JourSemaine;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.CongeRepository;
import com.pfe.gestioncliniquebackend.repository.DisponibiliteRepository;
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

    private final RendezVousRepository   rendezVousRepository;
    private final MedecinRepository      medecinRepository;
    private final PatientAccessService   patientAccessService;
    private final NotificationService    notificationService;
    private final CongeRepository        congeRepository;
    private final DisponibiliteRepository disponibiliteRepository;

    public List<RendezVousResponse> listerPourPatientConnecte() {
        Patient patient = patientAccessService.requireCurrentPatient();
        return rendezVousRepository.findAllByPatientIdOrdered(patient.getId()).stream()
                .filter(r -> r.getStatut() != StatutRendezVous.ANNULE)
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

        // Vérification congé
        if (congeRepository.existsByMedecinIdAndDateDebutLessThanEqualAndDateFinGreaterThanEqual(
                medecin.getId(), date, date)) {
            throw new IllegalArgumentException(
                    "Le médecin est en congé à cette date. Veuillez choisir une autre date.");
        }

        // Vérification disponibilité (seulement si le médecin a défini son planning)
        List<Disponibilite> allDispos = disponibiliteRepository.findByMedecinId(medecin.getId());
        if (!allDispos.isEmpty()) {
            JourSemaine jourSemaine = JourSemaine.fromDayOfWeek(date.getDayOfWeek());
            List<Disponibilite> disposJour = allDispos.stream()
                    .filter(d -> d.getJour() == jourSemaine).toList();
            if (disposJour.isEmpty()) {
                throw new IllegalArgumentException(
                        "Le médecin ne travaille pas ce jour de la semaine.");
            }
            boolean dansPlage = disposJour.stream().anyMatch(d ->
                    !debut.isBefore(d.getHeureDebut()) && !fin.isAfter(d.getHeureFin()));
            if (!dansPlage) {
                throw new IllegalArgumentException(
                        "Ce créneau n'est pas dans les horaires de travail du médecin.");
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
                .prixConsultation(medecin.getPrixConsultation())
                .build();

        RendezVous saved = rendezVousRepository.save(rdv);
        notifyCreation(saved);
        return toResponse(saved);
    }

    /**
     * Annulation côté patient : suppression définitive du rendez-vous (comme retiré de la base),
     * ce qui libère immédiatement le créneau pour un autre patient.
     */
    @Transactional
    public RendezVousResponse reporter(Long rendezVousId, RendezVousReporterRequest req) {
        Patient patient = patientAccessService.requireCurrentPatient();
        RendezVous rdv = rendezVousRepository.findByIdAndPatient_Id(rendezVousId, patient.getId())
                .orElseThrow(() -> new IllegalArgumentException("Rendez-vous introuvable"));

        if (rdv.getStatut() == StatutRendezVous.TERMINE || rdv.getStatut() == StatutRendezVous.ANNULE) {
            throw new IllegalArgumentException("Ce rendez-vous ne peut plus être reporté");
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

        if (rendezVousRepository.existsChevauchementExcluding(
                rdv.getId(), rdv.getMedecin().getId(), date, debut, fin, StatutRendezVous.ANNULE)) {
            throw new IllegalArgumentException(
                    "Ce créneau chevauche un autre rendez-vous. Choisissez une autre heure ou un autre jour.");
        }

        rdv.setDateRendezVous(date);
        rdv.setHeureDebut(debut);
        rdv.setHeureFin(fin);
        rdv.setStatut(StatutRendezVous.EN_ATTENTE);

        RendezVous saved = rendezVousRepository.save(rdv);
        notifyReport(saved);
        return toResponse(saved);
    }

    @Transactional
    public void annuler(Long rendezVousId) {
        Patient patient = patientAccessService.requireCurrentPatient();
        RendezVous rdv = rendezVousRepository.findByIdAndPatient_Id(rendezVousId, patient.getId())
                .orElseThrow(() -> new IllegalArgumentException("Rendez-vous introuvable"));

        notifyCancel(rdv);
        rendezVousRepository.delete(rdv);
    }

    private void notifyCreation(RendezVous rdv) {
        String date = rdv.getDateRendezVous().toString();
        String time = rdv.getHeureDebut().toString();
        String patientName = rdv.getPatient().getUtilisateur().getPrenom() + " " + rdv.getPatient().getUtilisateur().getNom();
        String medecinName = rdv.getMedecin().getUtilisateur().getPrenom() + " " + rdv.getMedecin().getUtilisateur().getNom();

        notificationService.createForUser(
                rdv.getPatient().getUtilisateur(),
                NotificationType.NOUVEAU_RENDEZ_VOUS,
                "Nouveau rendez-vous",
                "Votre rendez-vous avec Dr. " + medecinName + " le " + date + " à " + time + "."
        );
        notificationService.createForUser(
                rdv.getMedecin().getUtilisateur(),
                NotificationType.NOUVEAU_RENDEZ_VOUS,
                "Nouveau rendez-vous",
                "Nouveau rendez-vous avec " + patientName + " le " + date + " à " + time + "."
        );
        notificationService.createForRole(
                Role.ADMIN,
                NotificationType.NOUVEAU_RENDEZ_VOUS,
                "Nouveau rendez-vous",
                patientName + " a pris rendez-vous avec Dr. " + medecinName + " le " + date + " à " + time + "."
        );
    }

    private void notifyReport(RendezVous rdv) {
        String date = rdv.getDateRendezVous().toString();
        String time = rdv.getHeureDebut().toString();
        String patientName = rdv.getPatient().getUtilisateur().getPrenom() + " " + rdv.getPatient().getUtilisateur().getNom();
        String medecinName = rdv.getMedecin().getUtilisateur().getPrenom() + " " + rdv.getMedecin().getUtilisateur().getNom();

        notificationService.createForUser(
                rdv.getPatient().getUtilisateur(),
                NotificationType.NOUVEAU_RENDEZ_VOUS,
                "Rendez-vous reporté",
                "Votre rendez-vous avec Dr. " + medecinName + " a été reporté au " + date + " à " + time + "."
        );
        notificationService.createForUser(
                rdv.getMedecin().getUtilisateur(),
                NotificationType.NOUVEAU_RENDEZ_VOUS,
                "Rendez-vous reporté",
                patientName + " a reporté son rendez-vous au " + date + " à " + time + "."
        );
        notificationService.createForRole(
                Role.ADMIN,
                NotificationType.NOUVEAU_RENDEZ_VOUS,
                "Rendez-vous reporté",
                patientName + " a reporté son rendez-vous avec Dr. " + medecinName + " au " + date + " à " + time + "."
        );
    }

    private void notifyCancel(RendezVous rdv) {
        String date = rdv.getDateRendezVous().toString();
        String time = rdv.getHeureDebut().toString();
        String patientName = rdv.getPatient().getUtilisateur().getPrenom() + " " + rdv.getPatient().getUtilisateur().getNom();
        String medecinName = rdv.getMedecin().getUtilisateur().getPrenom() + " " + rdv.getMedecin().getUtilisateur().getNom();

        notificationService.createForUser(
                rdv.getPatient().getUtilisateur(),
                NotificationType.RENDEZ_VOUS_ANNULE,
                "Rendez-vous annulé",
                "Votre rendez-vous avec Dr. " + medecinName + " le " + date + " à " + time + " a été annulé."
        );
        notificationService.createForUser(
                rdv.getMedecin().getUtilisateur(),
                NotificationType.RENDEZ_VOUS_ANNULE,
                "Rendez-vous annulé",
                patientName + " a annulé son rendez-vous du " + date + " à " + time + "."
        );
        notificationService.createForRole(
                Role.ADMIN,
                NotificationType.RENDEZ_VOUS_ANNULE,
                "Rendez-vous annulé",
                patientName + " a annulé son rendez-vous avec Dr. " + medecinName + " du " + date + " à " + time + "."
        );
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
                .prixConsultation(r.getPrixConsultation())
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
