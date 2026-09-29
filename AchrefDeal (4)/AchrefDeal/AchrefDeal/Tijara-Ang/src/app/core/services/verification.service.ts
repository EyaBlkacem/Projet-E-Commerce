import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({ providedIn: 'root' })
export class VerificationService {

  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) {
      try { token = JSON.parse(currentUser).token || ''; } catch {}
    }
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  constructor(private http: HttpClient) {}

  // ─── Vérification d'identité vendeur ─────────────────────
  getVerifications(status: 'pending' | 'verified' | 'all' = 'pending', params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/verifications`, { headers: this.getHeaders(), params: { status, ...params } });
  }

  getVerificationDetail(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/verifications/${userId}`, { headers: this.getHeaders() });
  }

  verifyUser(userId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/verifications/${userId}/verify`, {}, { headers: this.getHeaders() });
  }

  rejectVerification(userId: number, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/verifications/${userId}/reject`, { reason }, { headers: this.getHeaders() });
  }
}
