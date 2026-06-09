package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.CatalogueHighlightsResponse;
import com.pfe.gestioncliniquebackend.dto.CreneauJourResponse;
import com.pfe.gestioncliniquebackend.dto.ProchainCreneauResponse;
import com.pfe.gestioncliniquebackend.entity.Conge;
import com.pfe.gestioncliniquebackend.entity.Disponibilite;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.RendezVous;
import com.pfe.gestioncliniquebackend.enums.JourSemaine;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import com.pfe.gestioncliniquebackend.repository.CongeRepository;
import com.pfe.gestioncliniquebackend.repository.DisponibiliteRepository;
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

@Service
@RequiredArgsConstructor
public class MedecinCatalogueService {

    private static final LocalTime JOUR_DEBUT           = LocalTime.of(8, 0);
    private static final LocalTime JOUR_FIN             = LocalTime.of(18, 0);
    private static final int       SLOT_MINUTES         = 30;
    private static final int       MAX_RDV_PAR_JOUR     = 12;
    private static final int       CRENEAUX_JOURS_DEFAUT = 14;
    /** Horizon maximal de scan pour trouver n créneaux malgré les congés. */
    private static final int       MAX_SCAN_HORIZON     = 400;

    private final MedecinRepository      medecinRepository;
    private final RendezVousRepository   rendezVousRepository;
    private final DisponibiliteRepository disponibiliteRepository;
    private final CongeRepository         congeRepository;

    public List<Medecin> getCatalogue(Long specialiteId, String q, Boolean disponible, String sort) {
        List<Medecin> base = medecinRepository.findAllValidatedForCatalogue(StatutValidationMedecin.VALIDE);
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);

        List<Medecin> filtered = base.stream()
                .filter(m -> specialiteId == null
                        || (m.getSpecialite() != null && specialiteId.equals(m.getSpecialite().getId())))
                .filter(m -> needle.isEmpty() || matchesNom(m, needle))
                .filter(m -> filterDisponibilite(m, disponible))
                .collect(Collectors.toCollection(ArrayList::new));

        filtered.sort(comparatorTri(sort));
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
        LocalDate from  = today.minusDays(30);
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

        // Charger disponibilités et congés une seule fois (évite les requêtes N+1)
        List<Disponibilite> allDispos = disponibiliteRepository.findByMedecinId(medecinId);
        boolean hasDisponibilites    = !allDispos.isEmpty();
        List<Conge> allConges        = congeRepository.findByMedecinId(medecinId);

        int n = days == null || days < 1 ? CRENEAUX_JOURS_DEFAUT : Math.min(days, 365);
        LocalDate start  = from != null ? from : LocalDate.now();
        LocalDate today  = LocalDate.now();
        List<CreneauJourResponse> out = new ArrayList<>();
        int offset = 0;

        // Itère jusqu'à avoir n résultats OU avoir atteint l'horizon max.
        // Les jours de congé sont ignorés : ils ne consomment pas le quota de résultats,
        // ce qui permet de trouver des créneaux après une longue période de congé.
        while (out.size() < n && offset < MAX_SCAN_HORIZON) {
            LocalDate d = start.plusDays(offset++);
            if (d.isBefore(today)) continue;

            // 1. Jour de congé → on saute sans l'ajouter au résultat
            if (enConge(d, allConges)) continue;

            // 2. Plafond de rendez-vous atteint
            long pris = rendezVousRepository.countRdvMedecinJour(medecinId, d, StatutRendezVous.ANNULE);
            if (pris >= MAX_RDV_PAR_JOUR) {
                out.add(CreneauJourResponse.builder().date(d).heuresDebut(List.of()).build());
                continue;
            }

            // 3. Disponibilités pour ce jour de la semaine
            JourSemaine jourEnum = JourSemaine.fromDayOfWeek(d.getDayOfWeek());
            List<Disponibilite> disposJour = allDispos.stream()
                    .filter(dispo -> dispo.getJour() == jourEnum)
                    .toList();

            if (hasDisponibilites && disposJour.isEmpty()) {
                // Planning défini mais pas ce jour → pas de consultation
                out.add(CreneauJourResponse.builder().date(d).heuresDebut(List.of()).build());
                continue;
            }

            // 4. Générer les créneaux
            List<RendezVous> rdvs = rendezVousRepository.findByMedecin_IdAndDateRendezVous(medecinId, d);
            List<LocalTime> slots;

            if (disposJour.isEmpty()) {
                // Aucun planning défini → comportement par défaut 08:00–18:00
                slots = generateSlots(d, JOUR_DEBUT, JOUR_FIN, rdvs);
            } else {
                slots = new ArrayList<>();
                for (Disponibilite dispo : disposJour) {
                    slots.addAll(generateSlots(d, dispo.getHeureDebut(), dispo.getHeureFin(), rdvs));
                }
                slots = slots.stream().distinct().sorted().collect(Collectors.toCollection(ArrayList::new));
            }

            out.add(CreneauJourResponse.builder().date(d).heuresDebut(slots).build());
        }
        return out;
    }

    public ProchainCreneauResponse getProchainCreneau(Long medecinId) {
        List<CreneauJourResponse> creneaux = getCreneaux(medecinId, LocalDate.now(), CRENEAUX_JOURS_DEFAUT);
        for (CreneauJourResponse jour : creneaux) {
            if (jour.getHeuresDebut() == null || jour.getHeuresDebut().isEmpty()) continue;
            LocalTime debut = jour.getHeuresDebut().get(0);
            LocalTime fin   = debut.plusMinutes(SLOT_MINUTES);
            return new ProchainCreneauResponse(jour.getDate(), debut, fin);
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun créneau disponible pour le moment");
    }

    public boolean aChevauchement(Long medecinId, LocalDate date, LocalTime debut, LocalTime fin) {
        return rendezVousRepository.existsChevauchement(medecinId, date, debut, fin, StatutRendezVous.ANNULE);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<LocalTime> generateSlots(LocalDate d, LocalTime debut, LocalTime fin, List<RendezVous> rdvs) {
        List<LocalTime> slots = new ArrayList<>();
        for (LocalTime t = debut; t.plusMinutes(SLOT_MINUTES).compareTo(fin) <= 0; t = t.plusMinutes(SLOT_MINUTES)) {
            LocalTime slotFin = t.plusMinutes(SLOT_MINUTES);
            if (d.equals(LocalDate.now()) && LocalDateTime.of(d, t).isBefore(LocalDateTime.now())) {
                continue;
            }
            if (slotLibre(t, slotFin, rdvs)) {
                slots.add(t);
            }
        }
        return slots;
    }

    private static boolean enConge(LocalDate date, List<Conge> conges) {
        return conges.stream().anyMatch(c ->
                !date.isBefore(c.getDateDebut()) && !date.isAfter(c.getDateFin()));
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
        String nom    = m.getUtilisateur().getNom()    != null ? m.getUtilisateur().getNom().toLowerCase(Locale.ROOT)    : "";
        String prenom = m.getUtilisateur().getPrenom() != null ? m.getUtilisateur().getPrenom().toLowerCase(Locale.ROOT) : "";
        return nom.contains(needle) || prenom.contains(needle) || (prenom + " " + nom).contains(needle);
    }

    private static boolean filterDisponibilite(Medecin m, Boolean disponible) {
        if (disponible == null) return true;
        if (Boolean.TRUE.equals(disponible))  return estDisponibleFlag(m);
        return Boolean.FALSE.equals(m.getDisponible());
    }

    private static Comparator<Medecin> comparatorTri(String sort) {
        String key = sort == null ? "" : sort.trim().toLowerCase(Locale.ROOT);
        if ("experience".equals(key)) {
            return Comparator
                    .comparing(Medecin::getExperienceAnnees, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing((Medecin m) -> m.getUtilisateur().getNom(), String.CASE_INSENSITIVE_ORDER);
        }
        if ("disponible".equals(key)) {
            return Comparator.comparing(MedecinCatalogueService::estDisponibleFlag).reversed()
                    .thenComparing((Medecin m) -> m.getUtilisateur().getNom(), String.CASE_INSENSITIVE_ORDER);
        }
        return Comparator.comparing((Medecin m) -> m.getUtilisateur().getNom(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing((Medecin m) -> m.getUtilisateur().getPrenom(), String.CASE_INSENSITIVE_ORDER);
    }
}
