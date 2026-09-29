import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Petit service transverse pour la lecture d'un utilisateur par id
 * et les actions admin dessus (utilisé par annonces, reclamations,
 * follows, admin users/vendors...). Évite les dépendances circulaires
 * entre les gros services métier.
 */
@Injectable({ providedIn: 'root' })
export class UsersService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getUserById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  updateUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, data, { headers: this.getHeaders() });
  }

  getVendorProfile(vendorId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${vendorId}`, { headers: this.getHeaders() });
  }

  // ─── Admin users ────────────────────────────────────────
  getAdminUserDetails(id: number): Observable<any> {
    return this.getUserById(id);
  }

  deleteAdminUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  toggleAdminUser(id: number): Observable<any> {
    return this.getAdminUserDetails(id).pipe(
      map((res: any) => res?.data ?? res),
      switchMap((user: any) => this.updateUser(id, { Active: !user?.Active }))
    );
  }

  toggleUserPremium(id: number): Observable<any> {
    return this.getAdminUserDetails(id).pipe(
      map((res: any) => res?.data ?? res),
      switchMap((user: any) => this.updateUser(id, { IsPremuim: !user?.IsPremuim }))
    );
  }

  getAdminStats(period: string = 'year'): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/stats?period=${period}`, { headers: this.getHeaders() });
  }

  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  getAdminAllUsers(role?: string, premium?: string, query: any = {}): Observable<any> {
    const params: any = { ...query };
    if (role) {
      params.IdRole = role === 'admin' ? 3 : role === 'vendor' ? 2 : 1;
    }
    if (premium) params.IsPremuim = premium === 'premium' ? 1 : 0;
    return this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders(), params });
  }
}
