package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.RendezVous;
import com.pfe.gestioncliniquebackend.enums.StatutRendezVous;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface RendezVousRepository extends JpaRepository<RendezVous, Long> {

    @Query(
            "SELECT r FROM RendezVous r JOIN FETCH r.medecin m JOIN FETCH m.utilisateur u "
                    + "LEFT JOIN FETCH m.specialite WHERE r.patient.id = :patientId "
                    + "ORDER BY r.dateRendezVous DESC, r.heureDebut DESC")
    List<RendezVous> findAllByPatientIdOrdered(@Param("patientId") Long patientId);

    Optional<RendezVous> findByIdAndPatient_Id(Long id, Long patientId);

    List<RendezVous> findByMedecin_IdAndDateRendezVous(Long medecinId, LocalDate date);

    @Query(
            "SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM RendezVous r "
                    + "WHERE r.medecin.id = :mid AND r.dateRendezVous = :d AND r.statut <> :annule "
                    + "AND r.heureDebut < :fin AND r.heureFin > :debut"
    )
    boolean existsChevauchement(
            @Param("mid") Long medecinId,
            @Param("d") LocalDate date,
            @Param("debut") LocalTime debut,
            @Param("fin") LocalTime fin,
            @Param("annule") StatutRendezVous annule
    );

    @Query(
            "SELECT r.medecin.id, COUNT(r) FROM RendezVous r WHERE r.dateRendezVous >= :from "
                    + "AND r.statut <> :annule GROUP BY r.medecin.id ORDER BY COUNT(r) DESC"
    )
    List<Object[]> countRdvParMedecinDepuis(@Param("from") LocalDate from, @Param("annule") StatutRendezVous annule);

    @Query(
            "SELECT COUNT(r) FROM RendezVous r WHERE r.medecin.id = :mid AND r.dateRendezVous = :d "
                    + "AND r.statut <> :annule"
    )
    long countRdvMedecinJour(@Param("mid") Long medecinId, @Param("d") LocalDate d, @Param("annule") StatutRendezVous annule);
}
