package com.pfe.gestioncliniquebackend.dto;

import lombok.Data;

@Data
public class NotificationCreateRequest {
    private Long userId;
    private String title;
    private String message;
    private String type;
}
