import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * Utilisé par : transports-admin, deliveries-admin, deliveries-ent.
 *
 * Backend confirmé (TransportsController::index) : searchable=[Name,Logo,
 * Phone,Email,Zones], filterable=[FreeFrom,Active], ranges=[DeliveryFee,
 * CreatedAt], paginate().
 * ⚠️ Pas de filtre "zone" dédié côté backend (le frontend filtrait par
 * zoneKey en local) — la recherche texte couvre déjà "Zones", donc router
 * la recherche de zone dans le paramètre `search` classique.
 *
 * ✅ FUSION des deux versions reçues :
 *  - Pattern autonome (apiUrl/getHeaders locaux) retenu, aligné sur
 *    ReviewsService / SettingsService / TokenStorageService.
 *  - toggleTransport() corrigé : le backend expose réellement
 *    POST /transports/{id}/toggle-active (TransportsController::toggleActive).
 *    L'ancienne route PATCH /transports/{id}/toggle n'a jamais existé côté
 *    Laravel -> 404 silencieux. Confirmé par la deuxième version reçue.
 *  - getTransports() : garde le support boolean de commodité (onlyActive)
 *    de la première version ET restaure les headers d'authentification
 *    qui manquaient dans la deuxième version (bug potentiel si la route
 *    liste est protégée côté backend).
 */
@Injectable({ providedIn: 'root' })
export class TransportsService {

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

  // Accepte soit un booléen de commodité (onlyActive, usage le plus courant
  // côté deliveries-admin/ent), soit un objet params libre pour les filtres
  // confirmés côté backend (search, FreeFrom, Active, plages
  // DeliveryFee/CreatedAt).
  getTransports(params: boolean | Record<string, any> = {}): Observable<any> {
    const finalParams = typeof params === 'boolean'
      ? (params ? { Active: 1 } : {})
      : params;
    return this.http.get(`${this.apiUrl}/transports`, { headers: this.getHeaders(), params: finalParams });
  }

  createTransport(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/transports`, data, { headers: this.getHeaders() });
  }

  updateTransport(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/transports/${id}`, data, { headers: this.getHeaders() });
  }

  // ✅ Route confirmée : POST /transports/{id}/toggle-active
  // (TransportsController::toggleActive). L'ancienne route
  // PATCH /transports/{id}/toggle n'existait pas côté backend.
  toggleTransport(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/transports/${id}/toggle-active`, {}, { headers: this.getHeaders() });
  }

  deleteTransport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transports/${id}`, { headers: this.getHeaders() });
  }
}