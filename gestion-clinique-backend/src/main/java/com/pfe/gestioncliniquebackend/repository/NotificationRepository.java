package com.pfe.gestioncliniquebackend.repository;

import com.pfe.gestioncliniquebackend.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUtilisateur_IdAndArchived(Long userId, boolean archived, Pageable pageable);

    Page<Notification> findByUtilisateur_IdAndArchivedAndIsRead(Long userId, boolean archived, boolean isRead, Pageable pageable);

    Page<Notification> findByUtilisateur_IdAndIsRead(Long userId, boolean isRead, Pageable pageable);

    List<Notification> findTop10ByUtilisateur_IdAndArchivedFalseOrderByCreatedAtDesc(Long userId);

    long countByUtilisateur_IdAndIsReadFalseAndArchivedFalse(Long userId);

    @Query(
            "SELECT n FROM Notification n WHERE n.utilisateur.id = :uid "
                    + "AND (:archived IS NULL OR n.archived = :archived) "
                    + "AND (:isRead IS NULL OR n.isRead = :isRead) "
                    + "AND (:q IS NULL OR LOWER(n.title) LIKE LOWER(CONCAT('%',:q,'%')) "
                    + "OR LOWER(n.message) LIKE LOWER(CONCAT('%',:q,'%'))) "
                    + "ORDER BY n.createdAt DESC"
    )
    Page<Notification> searchUserNotifications(
            @Param("uid") Long userId,
            @Param("archived") Boolean archived,
            @Param("isRead") Boolean isRead,
            @Param("q") String query,
            Pageable pageable
    );

    void deleteByIdAndUtilisateur_Id(Long id, Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.archived = true WHERE n.archived = false AND n.createdAt < :limit")
    int archiveBefore(@Param("limit") LocalDateTime limit);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :limit")
    int deleteBefore(@Param("limit") LocalDateTime limit);
}
