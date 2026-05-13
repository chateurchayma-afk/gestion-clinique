package com.pfe.gestioncliniquebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class NotificationPageResponse {
    private List<NotificationResponse> items;
    private int page;
    private int size;
    private long total;
    private long unreadCount;
}
