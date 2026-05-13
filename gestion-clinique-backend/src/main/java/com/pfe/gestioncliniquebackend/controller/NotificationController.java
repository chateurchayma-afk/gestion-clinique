package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.NotificationCreateRequest;
import com.pfe.gestioncliniquebackend.dto.NotificationPageResponse;
import com.pfe.gestioncliniquebackend.dto.NotificationResponse;
import com.pfe.gestioncliniquebackend.enums.NotificationType;
import com.pfe.gestioncliniquebackend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public NotificationPageResponse list(
            @RequestParam(value = "filter", required = false) String filter,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "20") int size
    ) {
        return notificationService.listNotifications(filter, query, page, size);
    }

    @GetMapping("/recent")
    public List<NotificationResponse> recent(@RequestParam(value = "limit", defaultValue = "6") int limit) {
        return notificationService.recent(limit);
    }

    @PostMapping
    public NotificationResponse create(@RequestBody NotificationCreateRequest body) {
        NotificationType type;
        try {
            type = body.getType() == null ? null : NotificationType.valueOf(body.getType().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            type = NotificationType.ALERTE_SYSTEME;
        }
        return notificationService.createForUserId(body.getUserId(), type, body.getTitle(), body.getMessage());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", notificationService.unreadCount());
    }

    @PutMapping("/read/{id}")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        notificationService.markRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/unread/{id}")
    public ResponseEntity<?> markUnread(@PathVariable Long id) {
        notificationService.markUnread(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.ok().build();
    }

    @PutMapping("/archive-old")
    public Map<String, Integer> archiveOld() {
        int count = notificationService.archiveAndPurgeOld();
        return Map.of("updated", count);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        notificationService.delete(id);
        return ResponseEntity.ok().build();
    }
}
