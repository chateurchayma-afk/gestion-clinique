package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    boolean existsByNumeroDossier(String numeroDossier);

    boolean existsByNumeroDossierAndIdNot(String numeroDossier, Long id);

    Optional<Patient> findByUtilisateur_Email(String email);

    @Query("SELECT p FROM Patient p JOIN FETCH p.utilisateur u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<Patient> findByUtilisateur_EmailWithUtilisateur(@Param("email") String email);

    /** Tous les patients avec utilisateur en une seule requête (évite N+1). */
    @Query("SELECT p FROM Patient p JOIN FETCH p.utilisateur u ORDER BY p.id DESC")
    List<Patient> findAllWithDetails();
}