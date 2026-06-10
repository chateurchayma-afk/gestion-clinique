package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.OrdonnancePatientResponse;
import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Ordonnance;
import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.repository.OrdonnanceRepository;
import com.pfe.gestioncliniquebackend.service.PatientAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/patient/ordonnances")
@RequiredArgsConstructor
public class PatientOrdonnanceController {

    private final PatientAccessService patientAccessService;
    private final OrdonnanceRepository ordonnanceRepository;

    @GetMapping
    public List<OrdonnancePatientResponse> mesOrdonnances() {
        Patient patient = patientAccessService.requireCurrentPatient();
        return ordonnanceRepository
                .findByPatient_IdOrderByDateOrdonnanceDesc(patient.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/{id}")
    public OrdonnancePatientResponse getOrdonnance(@PathVariable Long id) {
        Patient patient = patientAccessService.requireCurrentPatient();
        Ordonnance ord = ordonnanceRepository
                .findByIdAndPatient_Id(id, patient.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ordonnance introuvable"));
        return toDto(ord);
    }

    private OrdonnancePatientResponse toDto(Ordonnance o) {
        Medecin m = o.getMedecin();
        Utilisateur u = m.getUtilisateur();
        return OrdonnancePatientResponse.builder()
                .id(o.getId())
                .numeroOrdonnance(String.format("ORD-%06d", o.getId()))
                .dateOrdonnance(o.getDateOrdonnance())
                .createdAt(o.getCreatedAt())
                .medecinNom(u.getNom())
                .medecinPrenom(u.getPrenom())
                .medecinSpecialite(m.getSpecialite() != null ? m.getSpecialite().getNom() : null)
                .medecinTelephone(u.getTelephone())
                .medecinEmail(u.getEmail())
                .medicamentsText(o.getMedicamentsText())
                .qrUrl(o.getQrUrl())
                .build();
    }
}
