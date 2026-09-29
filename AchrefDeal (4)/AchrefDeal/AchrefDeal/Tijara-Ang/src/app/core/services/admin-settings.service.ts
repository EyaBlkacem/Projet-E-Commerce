import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : settings-admin.
 */
@Injectable({ providedIn: 'root' })
export class AdminSettingsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getAdminSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin-settings`, { headers: this.getHeaders() });
  }

  updateAdminSettings(settings: Record<string, string>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin-settings`, { settings }, { headers: this.getHeaders() });
  }

  getPointPackets(): Observable<any> {
    return this.http.get(`${this.apiUrl}/point-packets`, { headers: this.getHeaders() });
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
