import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8081/api/auth';

  constructor(private http: HttpClient) {}

  registerPatient(data: any) {
  return this.http.post('http://localhost:8081/api/auth/register-patient', data);
}

registerMedecin(data: any) {
  return this.http.post('http://localhost:8081/api/auth/register-medecin', data);
}

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }
}