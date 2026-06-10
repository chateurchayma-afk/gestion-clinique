package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.PatientDossierResponse;
import com.pfe.gestioncliniquebackend.dto.RappelTraitementPatientResponse;
import com.pfe.gestioncliniquebackend.entity.*;
import com.pfe.gestioncliniquebackend.repository.DossierMedicalRepository;
import com.pfe.gestioncliniquebackend.repository.RendezVousRepository;
import com.pfe.gestioncliniquebackend.service.DossierMedicalService;
import com.pfe.gestioncliniquebackend.service.PatientAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/patient/dossier-medical")
@RequiredArgsConstructor
public class PatientDossierMedicalController {

    private final DossierMedicalService dossierMedicalService;
    private final PatientAccessService patientAccessService;
    private final DossierMedicalRepository dossierRepository;
    private final RendezVousRepository rendezVousRepository;

    /** Dossier complet du patient connecté (lecture seule). */
    @GetMapping
    public ResponseEntity<PatientDossierResponse> monDossier() {
        Patient patient = patientAccessService.requireCurrentPatient();
        Utilisateur u = patient.getUtilisateur();

        DossierMedical dossier = dossierRepository.findByPatient_Id(patient.getId()).orElse(null);

        List<RendezVous> rdvList = rendezVousRepository.findAllByPatientIdOrdered(patient.getId());
        List<PatientDossierResponse.RendezVousHistoriqueItem> historique = rdvList.stream()
                .map(this::toHistoriqueItem)
                .toList();

        PatientDossierResponse.PatientDossierResponseBuilder builder = PatientDossierResponse.builder()
                .nom(u.getNom())
                .prenom(u.getPrenom())
                .dateNaissance(u.getDateNaissance())
                .sexe(u.getSexe() != null ? u.getSexe().name() : null)
                .numeroDossier(patient.getNumeroDossier())
                .historique(historique);

        if (dossier != null) {
            builder.dossierId(dossier.getId())
                    .groupeSanguin(dossier.getGroupeSanguin())
                    .tailleCm(dossier.getTailleCm())
                    .poidsKg(dossier.getPoidsKg())
                    .allergies(dossier.getAllergies())
                    .medicaments(dossier.getMedicaments())
                    .maladiesChroniques(dossier.getMaladiesChroniques())
                    .interventions(dossier.getInterventions())
                    .hospitalisations(dossier.getHospitalisations())
                    .famDiabete(dossier.isFamDiabete())
                    .famHypertension(dossier.isFamHypertension())
                    .famAsthme(dossier.isFamAsthme())
                    .famCardiaque(dossier.isFamCardiaque())
                    .famMentaux(dossier.isFamMentaux())
                    .famCancer(dossier.isFamCancer())
                    .tabac(dossier.getTabac())
                    .alcool(dossier.getAlcool())
                    .activite(dossier.getActivite())
                    .alimentation(dossier.getAlimentation())
                    .rappelTraitementNom(dossier.getRappelTraitementNom())
                    .rappelTraitementFrequence(dossier.getRappelTraitementFrequence())
                    .updatedAt(dossier.getUpdatedAt());

            if (dossier.getUpdatedByMedecin() != null) {
                Utilisateur mu = dossier.getUpdatedByMedecin().getUtilisateur();
                if (mu != null) {
                    builder.updatedByMedecinNom(mu.getNom())
                            .updatedByMedecinPrenom(mu.getPrenom());
                }
            }
        }

        return ResponseEntity.ok(builder.build());
    }

    @GetMapping("/rappel-traitement")
    public ResponseEntity<RappelTraitementPatientResponse> getRappelTraitement() {
        return ResponseEntity.ok(dossierMedicalService.getRappelTraitementPourPatientConnecte());
    }

    private PatientDossierResponse.RendezVousHistoriqueItem toHistoriqueItem(RendezVous rv) {
        Medecin m = rv.getMedecin();
        Utilisateur mu = m.getUtilisateur();
        String spec = (m.getSpecialite() != null) ? m.getSpecialite().getNom() : null;
        return PatientDossierResponse.RendezVousHistoriqueItem.builder()
                .id(rv.getId())
                .dateRendezVous(rv.getDateRendezVous())
                .heureDebut(rv.getHeureDebut() != null ? rv.getHeureDebut().toString() : null)
                .medecinNom(mu.getNom())
                .medecinPrenom(mu.getPrenom())
                .medecinSpecialite(spec)
                .motif(rv.getMotif())
                .statut(rv.getStatut() != null ? rv.getStatut().name() : null)
                .modeConsultation(rv.getModeConsultation() != null ? rv.getModeConsultation().name() : null)
                .prixConsultation(rv.getPrixConsultation())
                .build();
    }
}
