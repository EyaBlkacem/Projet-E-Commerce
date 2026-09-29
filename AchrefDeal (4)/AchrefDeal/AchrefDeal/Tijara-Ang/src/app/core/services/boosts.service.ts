import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ Service dédié au domaine « boosts » — extrait de tijara-api.service.ts
// à la demande de l'encadrant : chaque page/domaine a son propre service,
// pas tout regroupé dans un seul fichier géant.
//
// Autonome : contient sa propre gestion de l'URL de base et des headers
// d'authentification, pour ne dépendre d'aucun autre fichier — même
// approche que annonces.service.ts, products.service.ts, deals.service.ts,
// categories.service.ts.
@Injectable({ providedIn: 'root' })
export class BoostsService {

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

  // ─── Supervision des boosts (produits + annonces + deals) ────────
  // Correspond à BoostSupervisionController::index(), qui renvoie les 3
  // types confondus (product/ad/deal) dans un même tableau JSON.
  getActiveBoosts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/boosts/active`, { headers: this.getHeaders() });
  }

  deactivateProductBoost(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/product-boosts/${id}/deactivate`, {}, { headers: this.getHeaders() });
  }

  deactivateAdBoost(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/ad-boosts/${id}/deactivate`, {}, { headers: this.getHeaders() });
  }

  // ✅ AJOUTÉ — manquait alors que la route existe côté backend
  // (BoostSupervisionController::deactivateDealBoost, PATCH
  // /api/admin/deal-boosts/{id}/deactivate). Sans cette méthode, le
  // composant n'avait aucun moyen de désactiver un boost de type "deal".
  deactivateDealBoost(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/deal-boosts/${id}/deactivate`, {}, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : la vraie route Laravel est /boost-ads-packs, pas /boost-packs.
  getPublicBoostPacks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/boost-ads-packs`, { headers: this.getHeaders() });
  }
}