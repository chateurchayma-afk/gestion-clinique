package com.pfe.gestioncliniquebackend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String type;
    @JsonProperty("isRead")
    private boolean read;
    private boolean archived;
    private LocalDateTime createdAt;
}
