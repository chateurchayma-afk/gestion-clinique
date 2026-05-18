package com.pfe.gestioncliniquebackend.service;

import com.pfe.gestioncliniquebackend.dto.NotificationPageResponse;
import com.pfe.gestioncliniquebackend.dto.NotificationResponse;
import com.pfe.gestioncliniquebackend.entity.Notification;
import com.pfe.gestioncliniquebackend.entity.Utilisateur;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.enums.Role;
import com.pfe.gestioncliniquebackend.repository.NotificationRepository;
import com.pfe.gestioncliniquebackend.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;

    @Transactional(readOnly = true)
    public NotificationPageResponse listNotifications(String filter, String query, int page, int size) {
        Utilisateur user = requireCurrentUtilisateur();
        String f = (filter == null ? "" : filter.trim().toLowerCase());
        String q = (query == null || query.trim().isEmpty()) ? null : query.trim();

        Boolean archived = null;
        Boolean isRead = null;
        if ("archived".equals(f)) {
            archived = true;
        } else if ("unread".equals(f)) {
            archived = false;
            isRead = false;
        } else {
            archived = false;
        }

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Collection<NotificationType> excludedTypes = excludedTypesForRole(user.getRole());
        boolean filterTypes = !excludedTypes.isEmpty();
        Page<Notification> p = notificationRepository.searchUserNotifications(
                user.getId(), filterTypes, excludedTypes, archived, isRead, q, pageable
        );

        List<NotificationResponse> items = p.getContent().stream().map(NotificationService::toResponse).toList();
        long unreadCount = notificationRepository.countUnreadForUser(user.getId(), filterTypes, excludedTypes);

        return new NotificationPageResponse(items, p.getNumber(), p.getSize(), p.getTotalElements(), unreadCount);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> recent(int limit) {
        Utilisateur user = requireCurrentUtilisateur();
        int safe = Math.min(Math.max(limit, 1), 15);
        Collection<NotificationType> excludedTypes = excludedTypesForRole(user.getRole());
        boolean filterTypes = !excludedTypes.isEmpty();
        List<Notification> list = notificationRepository.findRecentForUser(
                user.getId(),
                filterTypes,
                excludedTypes,
                PageRequest.of(0, safe)
        );
        return list.stream().map(NotificationService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        Utilisateur user = requireCurrentUtilisateur();
        Collection<NotificationType> excludedTypes = excludedTypesForRole(user.getRole());
        boolean filterTypes = !excludedTypes.isEmpty();
        return notificationRepository.countUnreadForUser(user.getId(), filterTypes, excludedTypes);
    }

    @Transactional
    public void markRead(Long id) {
        Notification n = requireOwnedNotification(id);
        if (!n.isRead()) {
            n.setRead(true);
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void markUnread(Long id) {
        Notification n = requireOwnedNotification(id);
        if (n.isRead()) {
            n.setRead(false);
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void markAllRead() {
        Utilisateur user = requireCurrentUtilisateur();
        List<Notification> list = notificationRepository.findByUtilisateur_IdAndArchivedAndIsRead(
                user.getId(), false, false, PageRequest.of(0, 200)
        ).getContent().stream()
                .filter(n -> isAllowedForRole(n.getType(), user.getRole()))
                .toList();
        list.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(list);
    }

    @Transactional
    public void delete(Long id) {
        Utilisateur user = requireCurrentUtilisateur();
        notificationRepository.deleteByIdAndUtilisateur_Id(id, user.getId());
    }

    @Transactional
    public int archiveAndPurgeOld() {
        LocalDateTime now = LocalDateTime.now();
        int archived = notificationRepository.archiveBefore(now.minusDays(30));
        int deleted = notificationRepository.deleteBefore(now.minusDays(90));
        return archived + deleted;
    }

    @Transactional
    public NotificationResponse createForUserId(Long userId, NotificationType type, String title, String message) {
        Utilisateur current = requireCurrentUtilisateur();
        if (current.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul un administrateur peut créer une notification pour un autre compte");
        }
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Utilisateur requis");
        }
        Utilisateur user = utilisateurRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        Notification created = notificationRepository.save(buildNotification(user, type, title, message));
        return toResponse(created);
    }

    @Transactional
    public void createForUser(Utilisateur user, NotificationType type, String title, String message) {
        if (user == null) {
            return;
        }
        notificationRepository.save(buildNotification(user, type, title, message));
    }

    private Notification buildNotification(Utilisateur user, NotificationType type, String title, String message) {
        String t = title == null ? "" : title.trim();
        String m = message == null ? "" : message.trim();
        if (t.isEmpty()) {
            t = "Notification";
        }
        return Notification.builder()
                .utilisateur(user)
                .type(type == null ? NotificationType.ALERTE_SYSTEME : type)
                .title(t)
                .message(m)
                .isRead(false)
                .archived(false)
                .build();
    }

    private Notification requireOwnedNotification(Long id) {
        Utilisateur user = requireCurrentUtilisateur();
        Notification n = notificationRepository.findByIdAndUtilisateur_Id(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification introuvable"));
        if (!isAllowedForRole(n.getType(), user.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces refuse");
        }
        return n;
    }

    /** Types réservés à un rôle (double sécurité en plus du filtre par utilisateur). */
    private static Collection<NotificationType> excludedTypesForRole(Role role) {
        if (role == Role.MEDECIN) {
            return List.of(NotificationType.RAPPEL_TRAITEMENT, NotificationType.CONSULTATION_TERMINEE);
        }
        return List.of();
    }

    private static boolean isAllowedForRole(NotificationType type, Role role) {
        if (type == null) {
            return true;
        }
        return !excludedTypesForRole(role).contains(type);
    }

    private Utilisateur requireCurrentUtilisateur() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof String email) || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session invalide");
        }
        return utilisateurRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    }

    private static NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType() == null ? "ALERTE_SYSTEME" : n.getType().name(),
                n.isRead(),
                n.isArchived(),
                n.getCreatedAt()
        );
    }
}
