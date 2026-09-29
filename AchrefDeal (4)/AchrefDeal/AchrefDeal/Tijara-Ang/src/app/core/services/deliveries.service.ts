import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : deliveries-admin, deliveries-ent, my-deliveries-user,
 * dashboard-ent, orders-ent, reports-ent.
 *
 * Backend confirmé (DeliveriesController::index) : searchable=[TrackingNumber,
 * AddressLine,City,PostalCode,Phone,Note], filterable=[IdOrder,IdTransport,Status],
 * ranges=[DeliveryFee,EstimatedAt,DeliveredAt,CreatedAt,UpdatedAt], paginate().
 *
 * ⚠️ À VÉRIFIER AVANT PRODUCTION : updateDeliveryStatus utilise
 * POST /deliveries/{id}/status. Une variante PATCH /deliveries/{id} existe
 * aussi dans une autre version du code — à confirmer dans routes/api.php
 * laquelle est réellement enregistrée côté Laravel avant de faire confiance
 * à cette méthode en prod.
 */
@Injectable({ providedIn: 'root' })
export class DeliveriesService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getDeliveries(params: string | Record<string, any> = {}): Observable<any> {
    const finalParams = typeof params === 'string'
      ? (params ? { Status: params } : {})
      : params;
    return this.http.get(`${this.apiUrl}/deliveries`, { headers: this.getHeaders(), params: finalParams });
  }

  createDelivery(d: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/deliveries`, d, { headers: this.getHeaders() });
  }

  updateDeliveryStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/deliveries/${id}`, { Status: status }, { headers: this.getHeaders() });
  }

  updateDelivery(id: number, d: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/deliveries/${id}`, d, { headers: this.getHeaders() });
  }

  deleteDelivery(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deliveries/${id}`, { headers: this.getHeaders() });
  }

  markDelivered(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/deliveries/${id}/deliver`, {}, { headers: this.getHeaders() });
  }

  trackDelivery(trackingNumber: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries/track/${trackingNumber}`);
  }

  getDeliveriesByOrder(idOrder: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries/order/${idOrder}`, { headers: this.getHeaders() })
      .pipe(map((res: any) => res?.data ?? res ?? []));
  }

  getDeliveriesLookup(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries`, {
      headers: this.getHeaders(),
      params: { per_page: 1000 }
    });
  }
}
