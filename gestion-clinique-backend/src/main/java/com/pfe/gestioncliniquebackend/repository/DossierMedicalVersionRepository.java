package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.DossierMedicalVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DossierMedicalVersionRepository extends JpaRepository<DossierMedicalVersion, Long> {

    @Query("SELECT v FROM DossierMedicalVersion v "
            + "LEFT JOIN FETCH v.modifiePar m LEFT JOIN FETCH m.utilisateur "
            + "WHERE v.dossier.id = :dossierId ORDER BY v.versionNumero DESC")
    List<DossierMedicalVersion> findByDossierIdOrdered(@Param("dossierId") Long dossierId);

    long countByDossier_Id(Long dossierId);
}
