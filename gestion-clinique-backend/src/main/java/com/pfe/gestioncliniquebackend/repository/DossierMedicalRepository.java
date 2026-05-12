package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.DossierMedical;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DossierMedicalRepository extends JpaRepository<DossierMedical, Long> {
    Optional<DossierMedical> findByPatient_Id(Long patientId);
}
