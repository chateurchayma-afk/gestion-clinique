package com.pfe.gestioncliniquebackend.dto.chatbot;

import lombok.Data;
import java.util.List;

@Data
public class ChatbotRequest {
    private String message;
    private List<MessageDto> conversationHistory;
}
