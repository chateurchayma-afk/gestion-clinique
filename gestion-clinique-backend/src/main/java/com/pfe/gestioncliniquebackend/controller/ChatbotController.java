package com.pfe.gestioncliniquebackend.controller;

import com.pfe.gestioncliniquebackend.dto.chatbot.ChatbotRequest;
import com.pfe.gestioncliniquebackend.dto.chatbot.ChatbotResponse;
import com.pfe.gestioncliniquebackend.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/message")
    public ResponseEntity<ChatbotResponse> sendMessage(@RequestBody ChatbotRequest request) {
        String response = chatbotService.generateResponse(
                request.getMessage(),
                request.getConversationHistory()
        );
        return ResponseEntity.ok(new ChatbotResponse(response));
    }
}
