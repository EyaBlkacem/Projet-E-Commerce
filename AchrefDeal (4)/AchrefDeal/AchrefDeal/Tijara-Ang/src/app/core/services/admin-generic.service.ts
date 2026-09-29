import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Helper CRUD générique piloté par "path", utilisé tel quel dans l'ancien
 * service. Conservé à part car il est consommé par plusieurs écrans admin
 * qui n'ont pas de logique métier propre (boost-packs-admin, brands-admin,
 * causes-admin, cities-admin, countries-admin, coupons-admin, crud-generic,
 * prizes-admin, winners-admin) ainsi que par orders-user (adminList) et
 * deal-detail-admin / deals-admin (adminPatch/adminPut/adminDelete).
 */
@Injectable({ providedIn: 'root' })
export class AdminGenericService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  adminList(path: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${path}`, { headers: this.getHeaders() });
  }

  adminCreate(path: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${path}`, payload, { headers: this.getHeaders() });
  }

  adminUpdate(path: string, id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${path}/${id}`, payload, { headers: this.getHeaders() });
  }

  adminPut(path: string, id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${path}/${id}`, payload, { headers: this.getHeaders() });
  }

  adminPatch(subPath: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${subPath}`, {}, { headers: this.getHeaders() });
  }

  adminDelete(path: string, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${path}/${id}`, { headers: this.getHeaders() });
  }
}
