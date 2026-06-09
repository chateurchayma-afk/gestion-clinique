package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Disponibilite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DisponibiliteRepository extends JpaRepository<Disponibilite, Long> {
    List<Disponibilite> findByMedecinId(Long medecinId);
}
