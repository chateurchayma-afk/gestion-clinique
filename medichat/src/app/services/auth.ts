import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api-base';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${API_BASE_URL}/api/auth`;

  constructor(private http: HttpClient) {}

  /**
   * Le backend renvoie une chaîne brute (text/plain), pas du JSON : sans responseType 'text',
   * Angular tente un parse JSON → erreur côté client alors que l’enregistrement a réussi.
   */
  registerPatient(data: unknown) {
    return this.http.post(`${this.apiUrl}/register-patient`, data, { responseType: 'text' });
  }

  registerMedecin(data: unknown) {
    return this.http.post(`${this.apiUrl}/register-medecin`, data, { responseType: 'text' });
  }

  registerAdmin(data: unknown) {
    return this.http.post(`${this.apiUrl}/register-admin`, data, { responseType: 'text' });
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }
}