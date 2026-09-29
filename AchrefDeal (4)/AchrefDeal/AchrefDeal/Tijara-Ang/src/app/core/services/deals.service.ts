import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : deals-ent, dashboard-ent, invoices-ent, reports-ent,
 * detail/listing/index (landing), wishlist-user, deal-detail-admin,
 * deals-admin (via adminGeneric pour ces deux derniers).
 */
@Injectable({ providedIn: 'root' })
export class DealsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  // ─── Liste / détail ──────────────────────────────────────────────────
  getDeals(params?: any): Observable<any> {
    const backendParams = params?.__raw
      ? params.__raw
      : this.buildListingParams('deals', params ?? {});
    return this.http.get(`${this.apiUrl}/deals`, { params: backendParams });
  }

  getDeal(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals/${id}`);
  }

  getDealDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals/${id}`, { headers: this.getHeaders() });
  }

  getDealsLookup(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals`, { params: { per_page: 200 } });
  }

  getMyDeals(): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/deals`, {
      headers: this.getHeaders(),
      params: { idUser: userId as any, per_page: 50 } as any
    });
  }

  // ─── Création / édition / suppression ───────────────────────────────
  createDeal(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/deals`, data, { headers: this.getHeaders() });
  }

  updateDeal(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/deals/${id}`, data, { headers: this.getHeaders() });
  }

  updateDealAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/deals/${id}`, data, { headers: this.getHeaders() });
  }

  deleteDeal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deals/${id}`, { headers: this.getHeaders() });
  }

  deleteDealAdmin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/deals/${id}`, { headers: this.getHeaders() });
  }

  // FIX (confirmé par équipe admin) : toggleDealStatus supprimée, doublon
  // de activateDeal sur la même route (PATCH /deals/{id}/activate).
  // activateDeal(id) sans 2e argument = toggle simple, valable pour
  // vendeur ET admin.
  activateDeal(id: number, active?: boolean): Observable<any> {
    const payload = active === undefined ? {} : { active: active ? 1 : 0 };
    return this.http.patch(`${this.apiUrl}/deals/${id}/activate`, payload, { headers: this.getHeaders() });
  }

  // ─── Likes deals ─────────────────────────────────────────────────────
  getMyDealLikes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deal-likes`, { headers: this.getHeaders() });
  }

  addDealLike(dealId: number): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.post(`${this.apiUrl}/deal-likes`, { IdDeal: dealId, IdUser: userId }, { headers: this.getHeaders() });
  }

  removeDealLike(likeId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deal-likes/${likeId}`, { headers: this.getHeaders() });
  }

  getAdminDeals(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/deals`, { headers: this.getHeaders(), params });
  }
}