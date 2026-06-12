import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotRequest {
  message: string;
  conversationHistory: ChatMessage[];
}

export interface ChatbotApiResponse {
  response: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly http = inject(HttpClient);

  sendMessage(message: string, history: ChatMessage[]): Observable<ChatbotApiResponse> {
    const body: ChatbotRequest = {
      message,
      conversationHistory: history.slice(-10) // keep last 10 messages to limit tokens
    };
    return this.http.post<ChatbotApiResponse>(`${API_BASE_URL}/api/chatbot/message`, body);
  }
}
