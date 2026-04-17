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

  registerPatient(data: unknown) {
    return this.http.post(`${this.apiUrl}/register-patient`, data);
  }

  registerMedecin(data: unknown) {
    return this.http.post(`${this.apiUrl}/register-medecin`, data);
  }

  registerAdmin(data: unknown) {
    return this.http.post(`${this.apiUrl}/register-admin`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }
}