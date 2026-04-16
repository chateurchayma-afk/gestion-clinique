package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.entity.Patient;
import com.pfe.gestioncliniquebackend.service.PatientService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin(origins = "http://localhost:4200")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @GetMapping
    public List<Patient> getAllPatients() {
        return patientService.getAllPatients();
    }

    @PostMapping
    public Patient ajouterPatient(@RequestBody Patient patient) {
        return patientService.savePatient(patient);
    }

    @DeleteMapping("/{id}")
    public void supprimerPatient(@PathVariable Long id) {
        patientService.deletePatient(id);
    }
}