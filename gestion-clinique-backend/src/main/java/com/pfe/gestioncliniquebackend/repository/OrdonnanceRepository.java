package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Ordonnance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrdonnanceRepository extends JpaRepository<Ordonnance, Long> {

    List<Ordonnance> findByPatient_IdOrderByDateOrdonnanceDesc(Long patientId);

    Optional<Ordonnance> findByIdAndPatient_Id(Long id, Long patientId);
}
