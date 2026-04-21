package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.AdminRendezVousCreateRequest;
import com.pfe.gestioncliniquebackend.dto.AdminRendezVousPlanningItem;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.RendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
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
public class AdminRendezVousService {

    private final RendezVousRepository rendezVousRepository;
    private final MedecinRepository medecinRepository;
    private final PatientRepository patientRepository;

    /**
     * Planning sur une période. Si {@code statutExact} est renseigné (ex. {@link StatutRendezVous#CONFIRME}),
     * seuls ces RDV sont retournés ; sinon tous sauf annulés (comportement historique).
     */
    @Transactional(readOnly = true)
    public List<AdminRendezVousPlanningItem> listerPlanning(
            LocalDate start, LocalDate end, Long medecinId, StatutRendezVous statutExact) {
        if (start == null || end == null || end.isBefore(start)) {
            throw new IllegalArgumentException("Période invalide");
        }
        return rendezVousRepository
                .findForPlanning(start, end, medecinId, StatutRendezVous.ANNULE, statutExact)
                .stream()
                .map(this::toPlanningItem)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminRendezVousPlanningItem> listerGestion(StatutRendezVous filtreStatut) {
        List<RendezVous> rows =
                filtreStatut == null
                        ? rendezVousRepository.findAllGestionOrdered()
                        : rendezVousRepository.findAllGestionByStatutOrdered(filtreStatut);
        return rows.stream().map(this::toPlanningItem).toList();
    }

    @Transactional
    public AdminRendezVousPlanningItem modifierStatut(Long id, StatutRendezVous nouveauStatut) {
        RendezVous r = rendezVousRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Rendez-vous introuvable"));
        if (r.isAnnuleParPatient()
                && r.getStatut() == StatutRendezVous.ANNULE
                && nouveauStatut != StatutRendezVous.ANNULE) {
            throw new IllegalArgumentException(
                    "Ce rendez-vous a été annulé par le patient. Il ne peut pas être réactivé ni modifié vers un autre statut.");
        }
        r.setStatut(nouveauStatut);
        return toPlanningItem(rendezVousRepository.save(r));
    }

    @Transactional
    public AdminRendezVousPlanningItem creer(AdminRendezVousCreateRequest req) {
        Patient patient = patientRepository.findById(req.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient introuvable"));
        Medecin medecin = medecinRepository.findById(req.getMedecinId())
                .orElseThrow(() -> new IllegalArgumentException("Médecin introuvable"));
        if (medecin.getStatutValidation() != StatutValidationMedecin.VALIDE) {
            throw new IllegalArgumentException("Le médecin doit être validé");
        }
        if (Boolean.FALSE.equals(medecin.getDisponible())) {
            throw new IllegalArgumentException("Ce médecin est marqué indisponible");
        }

        LocalDate date = req.getDateRendezVous();
        if (date.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("La date ne peut pas être dans le passé");
        }

        LocalTime debut = req.getHeureDebut();
        LocalTime fin = req.getHeureFin() != null ? req.getHeureFin() : debut.plusMinutes(30);
        if (!fin.isAfter(debut)) {
            throw new IllegalArgumentException("L'heure de fin doit être après l'heure de début");
        }

        if (date.equals(LocalDate.now())) {
            if (LocalDateTime.of(date, debut).isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("L'heure choisie est déjà passée");
            }
        }

        if (rendezVousRepository.existsChevauchement(medecin.getId(), date, debut, fin, StatutRendezVous.ANNULE)) {
            throw new IllegalArgumentException("Créneau déjà occupé pour ce médecin");
        }

        String motif = req.getMotif() == null || req.getMotif().trim().isEmpty() ? null : req.getMotif().trim();

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

        return toPlanningItem(rendezVousRepository.save(rdv));
    }

    private AdminRendezVousPlanningItem toPlanningItem(RendezVous r) {
        return AdminRendezVousPlanningItem.builder()
                .id(r.getId())
                .dateRendezVous(r.getDateRendezVous())
                .heureDebut(r.getHeureDebut())
                .heureFin(r.getHeureFin())
                .statut(r.getStatut())
                .modeConsultation(r.getModeConsultation())
                .motif(r.getMotif())
                .patientId(r.getPatient().getId())
                .patientNom(r.getPatient().getUtilisateur().getNom())
                .patientPrenom(r.getPatient().getUtilisateur().getPrenom())
                .medecinId(r.getMedecin().getId())
                .medecinNom(r.getMedecin().getUtilisateur().getNom())
                .medecinPrenom(r.getMedecin().getUtilisateur().getPrenom())
                .annuleParPatient(r.isAnnuleParPatient())
                .build();
    }
}
