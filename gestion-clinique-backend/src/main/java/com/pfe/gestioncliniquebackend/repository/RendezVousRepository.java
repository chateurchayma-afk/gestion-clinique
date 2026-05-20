package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.entity.Patient;
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

    @Query("SELECT DISTINCT r.patient FROM RendezVous r WHERE r.medecin.id = :medecinId")
    List<Patient> findDistinctPatientsByMedecinId(@Param("medecinId") Long medecinId);

    @Query("SELECT DISTINCT r.medecin FROM RendezVous r WHERE r.patient.id = :patientId")
    List<Medecin> findDistinctMedecinsByPatientId(@Param("patientId") Long patientId);

    boolean existsByPatient_IdAndMedecin_Id(Long patientId, Long medecinId);

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
            "SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM RendezVous r "
                    + "WHERE r.id <> :excludeId AND r.medecin.id = :mid AND r.dateRendezVous = :d "
                    + "AND r.statut <> :annule AND r.heureDebut < :fin AND r.heureFin > :debut"
    )
    boolean existsChevauchementExcluding(
            @Param("excludeId") Long excludeId,
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

    @Query(
            "SELECT r FROM RendezVous r JOIN FETCH r.patient p JOIN FETCH p.utilisateur pu "
                    + "JOIN FETCH r.medecin m JOIN FETCH m.utilisateur mu "
                    + "WHERE r.dateRendezVous BETWEEN :start AND :end "
                    + "AND (:mid IS NULL OR m.id = :mid) "
                    + "AND r.statut <> :annule "
                    + "AND (:statutExact IS NULL OR r.statut = :statutExact) "
                    + "ORDER BY r.dateRendezVous ASC, r.heureDebut ASC"
    )
    List<RendezVous> findForPlanning(
            @Param("start") LocalDate start,
            @Param("end") LocalDate end,
            @Param("mid") Long medecinId,
            @Param("annule") StatutRendezVous annule,
            @Param("statutExact") StatutRendezVous statutExact
    );

    @Query(
            "SELECT DISTINCT r FROM RendezVous r JOIN FETCH r.patient p JOIN FETCH p.utilisateur JOIN FETCH r.medecin m "
                    + "JOIN FETCH m.utilisateur ORDER BY r.dateRendezVous DESC, r.heureDebut DESC"
    )
    List<RendezVous> findAllGestionOrdered();

    @Query(
            "SELECT DISTINCT r FROM RendezVous r JOIN FETCH r.patient p JOIN FETCH p.utilisateur JOIN FETCH r.medecin m "
                    + "JOIN FETCH m.utilisateur WHERE r.statut = :statut ORDER BY r.dateRendezVous DESC, r.heureDebut DESC"
    )
    List<RendezVous> findAllGestionByStatutOrdered(@Param("statut") StatutRendezVous statut);

    /** Trouver les rendez-vous par prix de consultation */
    List<RendezVous> findByPrixConsultation(Double prixConsultation);
}
