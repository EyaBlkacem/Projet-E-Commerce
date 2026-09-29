import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// FIX : le backend n'expose PAS de prefixe "/admin/..." pour les wallets.
// La route reelle (routes/api.php, Section 4 - admin) est un apiResource
// classique : GET/PUT/DELETE /wallets(/{id}). La distinction admin se fait
// par le role du token, pas par l'URL (meme convention que CatalogAdminService).
// Avant ce correctif, tous les appels ci-dessous visaient "/admin/wallets",
// une route inexistante -> 404 systematique -> "Chargement impossible."
@Injectable({ providedIn: 'root' })
export class WalletsService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) { try { token = JSON.parse(currentUser).token || ''; } catch {} }
    return new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) });
  }
  constructor(private http: HttpClient) {}

  getWallets(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/wallets`, { headers: this.getHeaders(), params });
  }

  getWallet(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/wallets/${id}`, { headers: this.getHeaders() });
  }

  updateWallet(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/wallets/${id}`, data, { headers: this.getHeaders() });
  }

  toggleActive(id: number, active: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/wallets/${id}`, { Active: active ? 1 : 0 }, { headers: this.getHeaders() });
  }
}
