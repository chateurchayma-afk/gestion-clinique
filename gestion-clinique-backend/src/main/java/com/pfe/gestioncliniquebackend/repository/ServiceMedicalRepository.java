package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.ServiceMedical;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceMedicalRepository extends JpaRepository<ServiceMedical, Long> {
}