import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : payment-user, payments-admin.
 *
 * Backend confirmé (PaymentsController::index) : searchable=[Reference],
 * filterable=[IdUser,IdOrder,Method,Status,TransactionId],
 * ranges=[Amount,CreatedAt,PaidAt], paginate().
 *
 * ✅ CONFLIT RÉSOLU : le fichier reçu de l'équipe admin utilise POST pour
 * completePayment()/refundPayment() — confirme l'alternative qui était
 * commentée ici. Bascule définitive sur POST (au lieu de PATCH).
 */
@Injectable({ providedIn: 'root' })
export class PaymentsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  createPayment(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments`, payload, { headers: this.getHeaders() }).pipe(
      tap((res: any) => {
        const id = res?.data?.IdPayment ?? res?.IdPayment ?? res?.id;
        if (id) this.trackPaymentId(id);
      })
    );
  }

  private get myPaymentIdsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `tijara_payment_ids_${userId}` : 'tijara_payment_ids_guest';
  }

  private trackPaymentId(id: number): void {
    try {
      const raw = localStorage.getItem(this.myPaymentIdsKey);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(this.myPaymentIdsKey, JSON.stringify(ids));
      }
    } catch { /* ignore */ }
  }

  getPayment(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments/${id}`, { headers: this.getHeaders() });
  }

  getMyTrackedPayments(): Observable<any[]> {
    let ids: number[] = [];
    try {
      const raw = localStorage.getItem(this.myPaymentIdsKey);
      ids = raw ? JSON.parse(raw) : [];
    } catch { ids = []; }
    if (ids.length === 0) return of([]);
    return forkJoin(
      ids.map(id =>
        this.getPayment(id).pipe(
          map((res: any) => res?.data ?? res ?? null),
          catchError(() => of(null))
        )
      )
    ).pipe(
      map((payments: any[]) => payments.filter(p => p !== null))
    );
  }

  getMyPayments(extraParams?: { from?: string; to?: string; per_page?: number }): Observable<any> {
    // Backend (Controller::buildFilteredQuery) : plage de dates = CreatedAt_min / CreatedAt_max
    const userId = this.getCurrentUserId();
    const params: any = { IdUser: userId as number, per_page: extraParams?.per_page ?? 50, sort_by: 'CreatedAt', sort_dir: 'desc' };
    if (extraParams?.from) params.CreatedAt_min = extraParams.from;
    if (extraParams?.to) params.CreatedAt_max = extraParams.to;
    return this.http.get(`${this.apiUrl}/payments`, { headers: this.getHeaders(), params });
  }

  getPaymentsByUser(idUser: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments`, {
      headers: this.getHeaders(),
      params: { IdUser: idUser, per_page: 50 }
    });
  }

  getPaymentsByOrder(idOrder: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments/order/${idOrder}`, { headers: this.getHeaders() });
  }

  // ─── Admin / listing général ──────────────────────────────────────────
  // Objet `params` libre pour coller aux filtres confirmés côté backend
  // (search, IdUser, IdOrder, Method, Status, TransactionId, plages
  // Amount/CreatedAt/PaidAt).
  getAllPayments(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments`, { headers: this.getHeaders(), params });
  }

  // Alias explicite de getAllPayments — confirmé aussi côté admin.
  getPayments(params: any = {}): Observable<any> {
    return this.getAllPayments(params);
  }

  // ✅ POST confirmé (les deux versions du fichier s'accordent maintenant).
  completePayment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments/${id}/complete`, {}, { headers: this.getHeaders() });
  }

  refundPayment(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments/${id}/refund`, {}, { headers: this.getHeaders() });
  }

  deletePayment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/payments/${id}`, { headers: this.getHeaders() });
  }
}