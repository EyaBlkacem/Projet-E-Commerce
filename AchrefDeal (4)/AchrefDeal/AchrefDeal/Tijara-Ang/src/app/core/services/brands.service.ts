import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/**
 * Backend confirmé (BrandsController::index -> buildFilteredQuery) :
 * searchable=[Title,Description], filterable=[Image,Active], paginate().
 * Route publique (pas d'auth) — confirmé par l'équipe admin.
 * Utilisé par : product-detail-admin (getBrands pour peupler un select),
 * brands-admin (CRUD + pagination).
 */
@Injectable({ providedIn: 'root' })
export class BrandsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  // params: { page, per_page, search, Active }
  // IMPORTANT : ne pas déballer la réponse ici (pas de .data ?? res) —
  // le backend renvoie une réponse paginée Laravel complète
  // (data, current_page, last_page, total...), nécessaire pour la
  // pagination numérique côté brands-admin. Le composant lit res.data
  // pour la liste et res.current_page/last_page/total pour le pager.
  getBrands(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/brands`, { params });
  }

  getBrand(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/brands/${id}`, { headers: this.getHeaders() }).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  createBrand(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/brands`, data, { headers: this.getHeaders() });
  }

  updateBrand(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/brands/${id}`, data, { headers: this.getHeaders() });
  }

  deleteBrand(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/brands/${id}`, { headers: this.getHeaders() });
  }
}