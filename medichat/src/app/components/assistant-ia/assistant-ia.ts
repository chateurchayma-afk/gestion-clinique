import {
  Component, OnInit, AfterViewChecked,
  ElementRef, ViewChild, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ChatMessage } from '../../services/chatbot.service';

interface DisplayMessage extends ChatMessage {
  id: number;
  timestamp: Date;
}

@Component({
  selector: 'app-assistant-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistant-ia.html',
  styleUrl: './assistant-ia.css'
})
export class AssistantIa implements OnInit, AfterViewChecked {
  private readonly chatbotService = inject(ChatbotService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  readonly isOpen    = signal(false);
  readonly isLoading = signal(false);
  readonly messages  = signal<DisplayMessage[]>([]);

  inputText = '';
  private msgIdCounter = 0;
  private shouldScrollToBottom = false;

  readonly quickQuestions = [
    'Quels sont les symptômes du diabète ?',
    "J'ai des douleurs à la poitrine",
    'Que faire en cas de fièvre ?',
    "J'ai des problèmes de peau",
  ];

  ngOnInit(): void {
    this.pushWelcome();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  toggleChat(): void {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.shouldScrollToBottom = true;
    }
  }

  closeChat(): void {
    this.isOpen.set(false);
  }

  sendMessage(text?: string): void {
    const content = (text ?? this.inputText).trim();
    if (!content || this.isLoading()) return;

    this.inputText = '';
    this.isLoading.set(true);
    this.shouldScrollToBottom = true;

    // Build history BEFORE adding the current message (avoids duplication)
    const history: ChatMessage[] = this.messages()
      .map(m => ({ role: m.role, content: m.content }));

    this.addMessage('user', content);

    this.chatbotService.sendMessage(content, history).subscribe({
      next: res => {
        this.addMessage('assistant', res.response);
        this.isLoading.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.addMessage('assistant', 'Désolé, une erreur est survenue. Veuillez réessayer.');
        this.isLoading.set(false);
        this.shouldScrollToBottom = true;
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.messages.set([]);
    this.pushWelcome();
  }

  private addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.update(msgs => [
      ...msgs,
      { id: ++this.msgIdCounter, role, content, timestamp: new Date() }
    ]);
  }

  private pushWelcome(): void {
    this.addMessage(
      'assistant',
      'Bonjour ! Je suis **MediBot**, votre assistant médical IA. Je peux vous aider à :\n\n' +
      '• Répondre à vos questions médicales générales\n' +
      '• Vous orienter vers la bonne spécialité selon vos symptômes\n' +
      '• Vous proposer de prendre rendez-vous\n\n' +
      'Comment puis-je vous aider aujourd\'hui ?'
    );
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  // Convert **bold** markdown to <strong> for display
  formatContent(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
}
