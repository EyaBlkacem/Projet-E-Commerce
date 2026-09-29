import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : coupons-user, prizes-user, index (landing), listing (landing),
 * detail (landing).
 */
@Injectable({ providedIn: 'root' })
export class PublicCatalogService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getPublicCoupons(): Observable<any> {
    return of([]);
  }

  getPublicPrizes(): Observable<any> {
    // PrizesController::index() renvoie une pagination Laravel
    // ({ data, total, current_page, ... }), pas un tableau brut.
    return this.http.get(`${this.apiUrl}/prizes`).pipe(
      map((res: any) => res?.data ?? res ?? []),
      catchError(() => of([]))
    );
  }

  // ⚠️ GET /winners n'a de route que sous le middleware ['auth:api','admin']
  // (routes/api.php, Section 4 — apiResource complet, sans ->only(['index','show'])
  // contrairement à /prizes). Pour un utilisateur non-admin, cet appel renvoie
  // donc un 403, intercepté ici pour ne pas casser l'UI. La liste ne sera
  // effectivement peuplée que pour un compte admin, tant que cette route
  // n'a pas de variante publique côté backend.
  getPublicWinners(): Observable<any> {
    return this.http.get(`${this.apiUrl}/winners`, { headers: this.getHeaders() }).pipe(
      map((res: any) => res?.data ?? res ?? []),
      catchError(() => of([]))
    );
  }

  // Même limitation que getPublicWinners() ci-dessus : GET /winners/{id}
  // est admin-only côté backend actuel.
  getPublicWinnerDetail(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/winners/${id}`, { headers: this.getHeaders() }).pipe(
      map((res: any) => res?.data ?? res),
      catchError(() => of(null))
    );
  }

  getVitrine(): Observable<any> {
    return this.http.get(`${this.apiUrl}/vitrine`, { headers: this.getHeaders() });
  }
}