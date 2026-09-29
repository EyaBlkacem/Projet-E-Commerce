import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({ providedIn: 'root' })
export class SettingsService {

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

 
  getAdminSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin-settings`, { headers: this.getHeaders(), params: { per_page: 100 } });
  }

  createAdminSetting(key: string, value: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin-settings`, { Key: key, Value: value }, { headers: this.getHeaders() });
  }

  updateAdminSetting(key: string, value: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin-settings/${key}`, { Value: value }, { headers: this.getHeaders() });
  }

  deleteAdminSetting(key: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin-settings/${key}`, { headers: this.getHeaders() });
  }

  // ─── Point Packets (CRUD admin) ──────────────────────────
  getPointPackets(): Observable<any> {
    return this.http.get(`${this.apiUrl}/point-packets`, { headers: this.getHeaders(), params: { per_page: 100 } });
  }

  createPointPacket(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/point-packets`, payload, { headers: this.getHeaders() });
  }

  updatePointPacket(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/point-packets/${id}`, payload, { headers: this.getHeaders() });
  }

  deletePointPacket(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/point-packets/${id}`, { headers: this.getHeaders() });
  }
}
