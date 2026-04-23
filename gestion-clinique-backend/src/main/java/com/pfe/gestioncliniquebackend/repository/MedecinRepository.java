package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Medecin;
import com.pfe.gestioncliniquebackend.enums.StatutValidationMedecin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MedecinRepository extends JpaRepository<Medecin, Long> {
    Optional<Medecin> findByUtilisateurId(Long utilisateurId);

    Optional<Medecin> findByUtilisateur_Email(String email);

    List<Medecin> findByStatutValidationOrderByIdDesc(StatutValidationMedecin statut);

    long countByStatutValidation(StatutValidationMedecin statut);

    /** Anciennes lignes avec {@code statut_validation} NULL traitées comme « en attente ». */
    @Query(
            "SELECT DISTINCT m FROM Medecin m JOIN FETCH m.utilisateur u "
                    + "LEFT JOIN FETCH m.specialite LEFT JOIN FETCH m.serviceMedical "
                    + "WHERE m.statutValidation = :st OR m.statutValidation IS NULL "
                    + "ORDER BY m.id DESC"
    )
    List<Medecin> findPendingValidationWithDetails(@Param("st") StatutValidationMedecin st);

    @Query("SELECT COUNT(m) FROM Medecin m WHERE m.statutValidation = :st OR m.statutValidation IS NULL")
    long countPendingOrNull(@Param("st") StatutValidationMedecin st);

    /** Tous les médecins validés (filtres métier appliqués en service). */
    @Query(
            "SELECT DISTINCT m FROM Medecin m JOIN FETCH m.utilisateur u "
                    + "LEFT JOIN FETCH m.specialite s LEFT JOIN FETCH m.serviceMedical sm "
                    + "WHERE m.statutValidation = :statut ORDER BY m.id DESC"
    )
    List<Medecin> findAllValidatedForCatalogue(@Param("statut") StatutValidationMedecin statut);
}
