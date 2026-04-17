import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly message = signal<string | null>(null);
  private readonly type = signal<ToastType>('info');
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly messageReadonly = this.message.asReadonly();
  readonly typeReadonly = this.type.asReadonly();

  show(text: string, kind: ToastType = 'info', durationMs = 4000): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.type.set(kind);
    this.message.set(text);
    this.timer = setTimeout(() => {
      this.message.set(null);
      this.timer = undefined;
    }, durationMs);
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.message.set(null);
  }
}
