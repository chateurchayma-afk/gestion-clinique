package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.CongeRequest;
import com.pfe.gestioncliniquebackend.dto.CongeResponse;
import com.pfe.gestioncliniquebackend.dto.DisponibiliteRequest;
import com.pfe.gestioncliniquebackend.dto.DisponibiliteResponse;
import com.pfe.gestioncliniquebackend.entity.Conge;
import com.pfe.gestioncliniquebackend.entity.Disponibilite;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.enums.JourSemaine;
import com.pfe.gestioncliniquebackend.repository.CongeRepository;
import com.pfe.gestioncliniquebackend.repository.DisponibiliteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DisponibiliteCongeService {

    private final DisponibiliteRepository disponibiliteRepository;
    private final CongeRepository congeRepository;
    private final MedecinAccessService medecinAccessService;

    private static final List<JourSemaine> ORDRE_JOURS = List.of(
            JourSemaine.LUNDI, JourSemaine.MARDI, JourSemaine.MERCREDI,
            JourSemaine.JEUDI, JourSemaine.VENDREDI, JourSemaine.SAMEDI, JourSemaine.DIMANCHE
    );

    // ── Disponibilités ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DisponibiliteResponse> mesDisponibilites() {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        return disponibiliteRepository.findByMedecinId(m.getId()).stream()
                .sorted(Comparator.comparingInt(d -> ORDRE_JOURS.indexOf(d.getJour())))
                .map(this::toDisponibiliteResponse)
                .toList();
    }

    @Transactional
    public DisponibiliteResponse ajouterDisponibilite(DisponibiliteRequest req) {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        validerHeures(req.getHeureDebut().toString(), req.getHeureFin().toString());
        Disponibilite d = Disponibilite.builder()
                .medecin(m)
                .jour(req.getJour())
                .heureDebut(req.getHeureDebut())
                .heureFin(req.getHeureFin())
                .build();
        return toDisponibiliteResponse(disponibiliteRepository.save(d));
    }

    @Transactional
    public DisponibiliteResponse modifierDisponibilite(Long id, DisponibiliteRequest req) {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        Disponibilite d = disponibiliteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Disponibilité introuvable"));
        if (!d.getMedecin().getId().equals(m.getId())) {
            throw new IllegalArgumentException("Accès refusé");
        }
        validerHeures(req.getHeureDebut().toString(), req.getHeureFin().toString());
        d.setJour(req.getJour());
        d.setHeureDebut(req.getHeureDebut());
        d.setHeureFin(req.getHeureFin());
        return toDisponibiliteResponse(disponibiliteRepository.save(d));
    }

    @Transactional
    public void supprimerDisponibilite(Long id) {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        Disponibilite d = disponibiliteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Disponibilité introuvable"));
        if (!d.getMedecin().getId().equals(m.getId())) {
            throw new IllegalArgumentException("Accès refusé");
        }
        disponibiliteRepository.delete(d);
    }

    // ── Congés ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CongeResponse> mesConges() {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        return congeRepository.findByMedecinId(m.getId()).stream()
                .sorted(Comparator.comparing(Conge::getDateDebut))
                .map(this::toCongeResponse)
                .toList();
    }

    @Transactional
    public CongeResponse ajouterConge(CongeRequest req) {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        validerDatesConge(req, null, m.getId());
        Conge c = Conge.builder()
                .medecin(m)
                .dateDebut(req.getDateDebut())
                .dateFin(req.getDateFin())
                .motif(req.getMotif())
                .build();
        return toCongeResponse(congeRepository.save(c));
    }

    @Transactional
    public CongeResponse modifierConge(Long id, CongeRequest req) {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        Conge c = congeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Congé introuvable"));
        if (!c.getMedecin().getId().equals(m.getId())) {
            throw new IllegalArgumentException("Accès refusé");
        }
        validerDatesConge(req, id, m.getId());
        c.setDateDebut(req.getDateDebut());
        c.setDateFin(req.getDateFin());
        c.setMotif(req.getMotif());
        return toCongeResponse(congeRepository.save(c));
    }

    @Transactional
    public void supprimerConge(Long id) {
        Medecin m = medecinAccessService.requireMedecinConnecte();
        Conge c = congeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Congé introuvable"));
        if (!c.getMedecin().getId().equals(m.getId())) {
            throw new IllegalArgumentException("Accès refusé");
        }
        congeRepository.delete(c);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validerHeures(String debut, String fin) {
        if (debut.compareTo(fin) >= 0) {
            throw new IllegalArgumentException("L'heure de fin doit être postérieure à l'heure de début");
        }
    }

    private void validerDatesConge(CongeRequest req, Long excludeId, Long medecinId) {
        if (req.getDateDebut().isAfter(req.getDateFin())) {
            throw new IllegalArgumentException("La date de fin doit être égale ou postérieure à la date de début");
        }
        long safeExcludeId = excludeId != null ? excludeId : -1L;
        boolean chevauchement = congeRepository
                .existsByMedecinIdAndIdNotAndDateDebutLessThanEqualAndDateFinGreaterThanEqual(
                        medecinId, safeExcludeId, req.getDateFin(), req.getDateDebut());
        if (chevauchement) {
            throw new IllegalArgumentException("Cette période chevauche un congé existant");
        }
    }

    // ── Accès public (sans authentification) ─────────────────────────────────

    @Transactional(readOnly = true)
    public List<DisponibiliteResponse> disponibilitesPubliques(Long medecinId) {
        return disponibiliteRepository.findByMedecinId(medecinId).stream()
                .sorted(Comparator.comparingInt(d -> ORDRE_JOURS.indexOf(d.getJour())))
                .map(this::toDisponibiliteResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CongeResponse> congesPublics(Long medecinId) {
        LocalDate today = LocalDate.now();
        return congeRepository.findByMedecinId(medecinId).stream()
                .filter(c -> !c.getDateFin().isBefore(today))
                .sorted(Comparator.comparing(Conge::getDateDebut))
                .map(this::toCongeResponse)
                .toList();
    }

    private DisponibiliteResponse toDisponibiliteResponse(Disponibilite d) {
        return DisponibiliteResponse.builder()
                .id(d.getId())
                .jour(d.getJour())
                .heureDebut(d.getHeureDebut())
                .heureFin(d.getHeureFin())
                .build();
    }

    private CongeResponse toCongeResponse(Conge c) {
        return CongeResponse.builder()
                .id(c.getId())
                .dateDebut(c.getDateDebut())
                .dateFin(c.getDateFin())
                .motif(c.getMotif())
                .build();
    }
}
