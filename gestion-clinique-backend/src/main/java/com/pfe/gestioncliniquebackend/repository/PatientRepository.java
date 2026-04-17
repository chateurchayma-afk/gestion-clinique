package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    boolean existsByNumeroDossier(String numeroDossier);

    boolean existsByNumeroDossierAndIdNot(String numeroDossier, Long id);
}