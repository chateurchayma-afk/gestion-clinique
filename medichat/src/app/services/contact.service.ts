import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactRequest {
  nom: string;
  email: string;
  sujet: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(data: ContactRequest): Observable<string> {
    return this.http.post(`${environment.apiBaseUrl}/api/contact`, data, { responseType: 'text' });
  }
}
