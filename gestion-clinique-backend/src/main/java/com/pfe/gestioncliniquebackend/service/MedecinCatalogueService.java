package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.CatalogueHighlightsResponse;
import com.pfe.gestioncliniquebackend.dto.CreneauJourResponse;
import com.pfe.gestioncliniquebackend.dto.ProchainCreneauResponse;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.RendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.MedecinRepository;
import com.pfe.gestioncliniquebackend.repository.RendezVousRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Catalogue patient : filtres, tri, sections « populaire / dispo aujourd’hui », créneaux.
 */
@Service
@RequiredArgsConstructor
public class MedecinCatalogueService {

    private static final LocalTime JOUR_DEBUT = LocalTime.of(8, 0);
    private static final LocalTime JOUR_FIN = LocalTime.of(18, 0);
    private static final int SLOT_MINUTES = 30;
    private static final int MAX_RDV_PAR_JOUR = 12;
    private static final int CRENEAUX_JOURS_DEFAUT = 14;

    private final MedecinRepository medecinRepository;
    private final RendezVousRepository rendezVousRepository;

        public List<Medecin> getCatalogue(
            Long specialiteId,
            String q,
            Boolean disponible,
            String sort
        ) {
        List<Medecin> base = medecinRepository.findAllValidatedForCatalogue(StatutValidationMedecin.VALIDE);
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);

        List<Medecin> filtered = base.stream()
                .filter(m -> specialiteId == null
                        || (m.getSpecialite() != null && specialiteId.equals(m.getSpecialite().getId())))
                
                .filter(m -> needle.isEmpty() || matchesNom(m, needle))
                .filter(m -> filterDisponibilite(m, disponible))
                .collect(Collectors.toCollection(ArrayList::new));

        Comparator<Medecin> cmp = comparatorTri(sort);
        filtered.sort(cmp);
        return filtered;
    }

    public Medecin getCatalogueMedecinPublic(Long id) {
        Medecin m = medecinRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Médecin introuvable"));
        if (m.getStatutValidation() != StatutValidationMedecin.VALIDE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Médecin introuvable");
        }
        return m;
    }

    public CatalogueHighlightsResponse getHighlights() {
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(30);
        Set<Long> valides = medecinRepository.findAllValidatedForCatalogue(StatutValidationMedecin.VALIDE).stream()
                .map(Medecin::getId)
                .collect(Collectors.toSet());

        List<Object[]> rows = rendezVousRepository.countRdvParMedecinDepuis(from, StatutRendezVous.ANNULE);
        List<Long> populaires = rows.stream()
                .map(r -> (Long) r[0])
                .filter(valides::contains)
                .limit(5)
                .toList();

        List<Long> dispoAujourdhui = medecinRepository.findAllValidatedForCatalogue(StatutValidationMedecin.VALIDE).stream()
                .filter(MedecinCatalogueService::estDisponibleFlag)
                .filter(m -> rendezVousRepository.countRdvMedecinJour(m.getId(), today, StatutRendezVous.ANNULE) < MAX_RDV_PAR_JOUR)
                .map(Medecin::getId)
                .limit(10)
                .toList();

        return CatalogueHighlightsResponse.builder()
                .medecinsPopulairesIds(populaires)
                .medecinsDisponiblesAujourdhuiIds(dispoAujourdhui)
                .build();
    }

    public List<CreneauJourResponse> getCreneaux(Long medecinId, LocalDate from, Integer days) {
        Medecin m = getCatalogueMedecinPublic(medecinId);
        if (!estDisponibleFlag(m)) {
            return List.of();
        }
        int n = days == null || days < 1 ? CRENEAUX_JOURS_DEFAUT : Math.min(days, 60);
        LocalDate start = from != null ? from : LocalDate.now();
        List<CreneauJourResponse> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            LocalDate d = start.plusDays(i);
            if (d.isBefore(LocalDate.now())) {
                continue;
            }
            long pris = rendezVousRepository.countRdvMedecinJour(medecinId, d, StatutRendezVous.ANNULE);
            if (pris >= MAX_RDV_PAR_JOUR) {
                out.add(CreneauJourResponse.builder().date(d).heuresDebut(List.of()).build());
                continue;
            }
            List<RendezVous> rdvs = rendezVousRepository.findByMedecin_IdAndDateRendezVous(medecinId, d);
            List<LocalTime> slots = new ArrayList<>();
            for (LocalTime t = JOUR_DEBUT; t.plusMinutes(SLOT_MINUTES).compareTo(JOUR_FIN) <= 0; t = t.plusMinutes(SLOT_MINUTES)) {
                LocalTime fin = t.plusMinutes(SLOT_MINUTES);
                if (d.equals(LocalDate.now())) {
                    if (LocalDateTime.of(d, t).isBefore(LocalDateTime.now())) {
                        continue;
                    }
                }
                if (slotLibre(t, fin, rdvs)) {
                    slots.add(t);
                }
            }
            out.add(CreneauJourResponse.builder().date(d).heuresDebut(slots).build());
        }
        return out;
    }

    public ProchainCreneauResponse getProchainCreneau(Long medecinId) {
        List<CreneauJourResponse> creneaux = getCreneaux(medecinId, LocalDate.now(), CRENEAUX_JOURS_DEFAUT);
        for (CreneauJourResponse jour : creneaux) {
            if (jour.getHeuresDebut() == null || jour.getHeuresDebut().isEmpty()) {
                continue;
            }
            LocalTime debut = jour.getHeuresDebut().get(0);
            LocalTime fin = debut.plusMinutes(SLOT_MINUTES);
            return new ProchainCreneauResponse(jour.getDate(), debut, fin);
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun créneau disponible pour le moment");
    }

    public boolean aChevauchement(Long medecinId, LocalDate date, LocalTime debut, LocalTime fin) {
        return rendezVousRepository.existsChevauchement(medecinId, date, debut, fin, StatutRendezVous.ANNULE);
    }

    private static boolean slotLibre(LocalTime debut, LocalTime fin, List<RendezVous> rdvs) {
        return rdvs.stream()
                .filter(r -> r.getStatut() != StatutRendezVous.ANNULE)
                .noneMatch(r -> r.getHeureDebut().isBefore(fin) && r.getHeureFin().isAfter(debut));
    }

    private static boolean estDisponibleFlag(Medecin m) {
        return !Boolean.FALSE.equals(m.getDisponible());
    }

    private static boolean matchesNom(Medecin m, String needle) {
        String nom = m.getUtilisateur().getNom() != null ? m.getUtilisateur().getNom().toLowerCase(Locale.ROOT) : "";
        String prenom = m.getUtilisateur().getPrenom() != null ? m.getUtilisateur().getPrenom().toLowerCase(Locale.ROOT) : "";
        return nom.contains(needle) || prenom.contains(needle) || (prenom + " " + nom).contains(needle);
    }

    /**
     * @param disponible {@code null} = tous, {@code true} = accepte les patients, {@code false} = marqué indisponible.
     */
    private static boolean filterDisponibilite(Medecin m, Boolean disponible) {
        if (disponible == null) {
            return true;
        }
        if (Boolean.TRUE.equals(disponible)) {
            return estDisponibleFlag(m);
        }
        return Boolean.FALSE.equals(m.getDisponible());
    }

    private static Comparator<Medecin> comparatorTri(String sort) {
        String key = sort == null ? "" : sort.trim().toLowerCase(Locale.ROOT);
        if ("experience".equals(key)) {
            return Comparator
                    .comparing(Medecin::getExperienceAnnees, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(
                            (Medecin m) -> m.getUtilisateur().getNom(),
                            String.CASE_INSENSITIVE_ORDER);
        }
        if ("disponible".equals(key)) {
            return Comparator
                    .comparing(MedecinCatalogueService::estDisponibleFlag)
                    .reversed()
                    .thenComparing(
                            (Medecin m) -> m.getUtilisateur().getNom(),
                            String.CASE_INSENSITIVE_ORDER);
        }
        return Comparator
                .comparing((Medecin m) -> m.getUtilisateur().getNom(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing((Medecin m) -> m.getUtilisateur().getPrenom(), String.CASE_INSENSITIVE_ORDER);
    }
}
