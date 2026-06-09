package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Conge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CongeRepository extends JpaRepository<Conge, Long> {
    List<Conge> findByMedecinId(Long medecinId);

    boolean existsByMedecinIdAndIdNotAndDateDebutLessThanEqualAndDateFinGreaterThanEqual(
            Long medecinId, Long excludeId, LocalDate dateFin, LocalDate dateDebut);

    /** Vérifie si une date précise est couverte par un congé du médecin. */
    boolean existsByMedecinIdAndDateDebutLessThanEqualAndDateFinGreaterThanEqual(
            Long medecinId, LocalDate date1, LocalDate date2);
}
