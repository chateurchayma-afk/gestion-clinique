package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.DossierMedicalRequest;
import com.pfe.gestioncliniquebackend.dto.DossierMedicalResponse;
import com.pfe.gestioncliniquebackend.dto.DossierMedicalVersionResponse;
import com.pfe.gestioncliniquebackend.dto.RappelTraitementPatientResponse;
import com.pfe.gestioncliniquebackend.entity.DossierMedical;
import com.pfe.gestioncliniquebackend.entity.DossierMedicalVersion;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.repository.DossierMedicalRepository;
import com.pfe.gestioncliniquebackend.repository.DossierMedicalVersionRepository;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DossierMedicalService {

    private static final String MSG_RENOUVELLEMENT = "Le patient doit renouveler son traitement.";

    private static final Map<String, String> FREQUENCE_LIBELLES = Map.of(
            "CHAQUE_JOUR", "Chaque jour",
            "CHAQUE_SEMAINE", "Chaque semaine",
            "CHAQUE_MOIS", "Chaque mois",
            "DEUX_FOIS_JOUR", "Deux fois par jour"
    );

    private final DossierMedicalRepository dossierRepository;
    private final DossierMedicalVersionRepository versionRepository;
    private final PatientRepository patientRepository;
    private final MedecinAccessService medecinAccessService;
    private final PatientAccessService patientAccessService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public DossierMedicalResponse getByPatientId(Long patientId) {
        Patient patient = requirePatient(patientId);
        requireMedecinAccess(patientId);
        DossierMedical dossier = dossierRepository.findByPatient_Id(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dossier introuvable"));
        return toResponse(dossier, patient.getId());
    }

    @Transactional
    public DossierMedicalResponse saveForPatient(Long patientId, DossierMedicalRequest request) {
        Patient patient = requirePatient(patientId);
        Medecin medecin = medecinAccessService.requireMedecinConnecte();
        if (!medecinAccessService.medecinConcernePatient(medecin.getId(), patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces interdit");
        }

        Optional<DossierMedical> existing = dossierRepository.findByPatient_Id(patientId);
        DossierMedical dossier = existing.orElseGet(() -> DossierMedical.builder().patient(patient).build());

        String ancienNom = dossier.getRappelTraitementNom();
        String ancienneFreq = dossier.getRappelTraitementFrequence();

        applyRequest(dossier, request);
        dossier.setUpdatedAt(LocalDateTime.now());
        dossier.setUpdatedByMedecin(medecin);
        DossierMedical saved = dossierRepository.save(dossier);

        // Sauvegarde de la version après chaque enregistrement
        long nextNum = versionRepository.countByDossier_Id(saved.getId()) + 1;
        versionRepository.save(snapshotVersion(saved, medecin, (int) nextNum));

        notifierRappelTraitementSiBesoin(patient, ancienNom, ancienneFreq, saved);
        return toResponse(saved, patient.getId());
    }

    @Transactional(readOnly = true)
    public RappelTraitementPatientResponse getRappelTraitementPourPatientConnecte() {
        Patient patient = patientAccessService.requireCurrentPatient();
        Optional<DossierMedical> opt = dossierRepository.findByPatient_Id(patient.getId());
        if (opt.isEmpty()) {
            return new RappelTraitementPatientResponse(false, null, null, null);
        }
        DossierMedical dossier = opt.get();
        String nom = dossier.getRappelTraitementNom();
        if (nom == null || nom.isBlank()) {
            return new RappelTraitementPatientResponse(false, null, null, null);
        }
        String freqLibelle = libelleFrequence(dossier.getRappelTraitementFrequence());
        return new RappelTraitementPatientResponse(true, nom.trim(), freqLibelle, MSG_RENOUVELLEMENT);
    }

    private void notifierRappelTraitementSiBesoin(
            Patient patient,
            String ancienNom,
            String ancienneFreq,
            DossierMedical dossier) {
        String nouveauNom = dossier.getRappelTraitementNom();
        if (nouveauNom == null || nouveauNom.isBlank()) {
            return;
        }
        String nouvelleFreq = dossier.getRappelTraitementFrequence();
        boolean nomChange = ancienNom == null || ancienNom.isBlank() || !ancienNom.trim().equals(nouveauNom.trim());
        boolean freqChange = !Objects.equals(
                ancienneFreq == null ? "" : ancienneFreq.trim(),
                nouvelleFreq == null ? "" : nouvelleFreq.trim());
        if (!nomChange && !freqChange) {
            return;
        }
        Utilisateur u = patient.getUtilisateur();
        if (u == null) {
            return;
        }
        String freqLibelle = libelleFrequence(nouvelleFreq);
        StringBuilder msg = new StringBuilder();
        msg.append("Votre médecin vous rappelle de renouveler votre traitement : ");
        msg.append(nouveauNom.trim());
        if (freqLibelle != null && !freqLibelle.isBlank()) {
            msg.append(" (").append(freqLibelle).append(')');
        }
        msg.append(". Pensez à prendre rendez-vous pour un suivi.");
        notificationService.createForUser(
                u,
                NotificationType.RAPPEL_TRAITEMENT,
                "Rappel traitement — action importante",
                msg.toString());
    }

    private static String libelleFrequence(String codeOuTexte) {
        if (codeOuTexte == null || codeOuTexte.isBlank()) {
            return "";
        }
        String key = codeOuTexte.trim();
        return FREQUENCE_LIBELLES.getOrDefault(key, key);
    }

    @Transactional(readOnly = true)
    public List<DossierMedicalVersionResponse> getHistorique(Long patientId) {
        requirePatient(patientId);
        requireMedecinAccess(patientId);
        return dossierRepository.findByPatient_Id(patientId)
                .map(d -> versionRepository.findByDossierIdOrdered(d.getId()).stream()
                        .map(DossierMedicalVersionResponse::from)
                        .toList())
                .orElse(List.of());
    }

    private DossierMedicalVersion snapshotVersion(DossierMedical d, Medecin medecin, int numero) {
        return DossierMedicalVersion.builder()
                .dossier(d)
                .versionNumero(numero)
                .modifieLe(d.getUpdatedAt())
                .modifiePar(medecin)
                .groupeSanguin(d.getGroupeSanguin())
                .tailleCm(d.getTailleCm())
                .poidsKg(d.getPoidsKg())
                .allergies(d.getAllergies())
                .medicaments(d.getMedicaments())
                .maladiesChroniques(d.getMaladiesChroniques())
                .interventions(d.getInterventions())
                .hospitalisations(d.getHospitalisations())
                .famDiabete(d.isFamDiabete())
                .famHypertension(d.isFamHypertension())
                .famAsthme(d.isFamAsthme())
                .famCardiaque(d.isFamCardiaque())
                .famMentaux(d.isFamMentaux())
                .famCancer(d.isFamCancer())
                .tabac(d.getTabac())
                .alcool(d.getAlcool())
                .activite(d.getActivite())
                .alimentation(d.getAlimentation())
                .rappelTraitementNom(d.getRappelTraitementNom())
                .rappelTraitementFrequence(d.getRappelTraitementFrequence())
                .build();
    }

    private Patient requirePatient(Long patientId) {
        return patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient introuvable"));
    }

    private void requireMedecinAccess(Long patientId) {
        Medecin medecin = medecinAccessService.requireMedecinConnecte();
        if (!medecinAccessService.medecinConcernePatient(medecin.getId(), patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces interdit");
        }
    }

    private void applyRequest(DossierMedical dossier, DossierMedicalRequest req) {
        dossier.setGroupeSanguin(req.getGroupeSanguin());
        dossier.setTailleCm(req.getTailleCm());
        dossier.setPoidsKg(req.getPoidsKg());
        dossier.setAllergies(req.getAllergies());
        dossier.setMedicaments(req.getMedicaments());
        dossier.setMaladiesChroniques(req.getMaladiesChroniques());
        dossier.setInterventions(req.getInterventions());
        dossier.setHospitalisations(req.getHospitalisations());
        dossier.setFamDiabete(req.isFamDiabete());
        dossier.setFamHypertension(req.isFamHypertension());
        dossier.setFamAsthme(req.isFamAsthme());
        dossier.setFamCardiaque(req.isFamCardiaque());
        dossier.setFamMentaux(req.isFamMentaux());
        dossier.setFamCancer(req.isFamCancer());
        dossier.setTabac(req.getTabac());
        dossier.setAlcool(req.getAlcool());
        dossier.setActivite(req.getActivite());
        dossier.setAlimentation(req.getAlimentation());
        dossier.setRappelTraitementNom(req.getRappelTraitementNom());
        dossier.setRappelTraitementFrequence(req.getRappelTraitementFrequence());
    }

    private DossierMedicalResponse toResponse(DossierMedical dossier, Long patientId) {
        return new DossierMedicalResponse(
                dossier.getId(),
                patientId,
                dossier.getGroupeSanguin(),
                dossier.getTailleCm(),
                dossier.getPoidsKg(),
                dossier.getAllergies(),
                dossier.getMedicaments(),
                dossier.getMaladiesChroniques(),
                dossier.getInterventions(),
                dossier.getHospitalisations(),
                dossier.isFamDiabete(),
                dossier.isFamHypertension(),
                dossier.isFamAsthme(),
                dossier.isFamCardiaque(),
                dossier.isFamMentaux(),
                dossier.isFamCancer(),
                dossier.getTabac(),
                dossier.getAlcool(),
                dossier.getActivite(),
                dossier.getAlimentation(),
                dossier.getRappelTraitementNom(),
                dossier.getRappelTraitementFrequence()
        );
    }
}
