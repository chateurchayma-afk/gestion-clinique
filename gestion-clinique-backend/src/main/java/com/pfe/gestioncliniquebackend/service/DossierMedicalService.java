package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.DossierMedicalRequest;
import com.pfe.gestioncliniquebackend.dto.DossierMedicalResponse;
import com.pfe.gestioncliniquebackend.entity.DossierMedical;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.repository.DossierMedicalRepository;
import com.pfe.gestioncliniquebackend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DossierMedicalService {

    private final DossierMedicalRepository dossierRepository;
    private final PatientRepository patientRepository;
    private final MedecinAccessService medecinAccessService;

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
        requireMedecinAccess(patientId);

        DossierMedical dossier = dossierRepository.findByPatient_Id(patientId)
                .orElseGet(() -> DossierMedical.builder().patient(patient).build());

        applyRequest(dossier, request);
        DossierMedical saved = dossierRepository.save(dossier);
        return toResponse(saved, patient.getId());
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
                dossier.getAlimentation()
        );
    }
}
