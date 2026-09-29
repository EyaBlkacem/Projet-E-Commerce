import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : invoices-admin, invoices-ent, my-invoices-user,
 * dashboard-user, dashboard-ent, payment-user.
 *
 * Backend confirmé pour la liste admin (InvoicesController::index,
 * implémentation manuelle, pas buildFilteredQuery) : ?search= (Number/
 * PaymentMethod/PaymentTerms/Status), ?IdUser=, ?IdVendor=, ?IdOrder=,
 * ?Status=, ?from=/?to= (sur IssuedAt), ?min= (sur Total).
 * ⚠️ Pas de paginate() constaté dans ce controller — à vérifier/ajouter
 * côté backend si le volume de factures grandit ; on envoie quand même
 * page/per_page au cas où, sans casser si le backend les ignore encore.
 *
 * ⚠️ NE PAS RENOMMER getInvoices() en signature générique (params) —
 * elle vise spécifiquement le client courant (/customers/{id}/invoices).
 * La liste admin générique passe par getAdminInvoices(params) ci-dessous,
 * volontairement séparée pour éviter qu'un composant utilisateur reçoive
 * par erreur les factures de tout le monde.
 */
@Injectable({ providedIn: 'root' })
export class InvoicesService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  // Factures du client courant (route dédiée, pas de filtres)
  getInvoices(): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/customers/${userId}/invoices`, { headers: this.getHeaders() });
  }

  // Usage admin/listing générique — distincte de getInvoices() ci-dessus.
  getAdminInvoices(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/invoices`, { headers: this.getHeaders(), params });
  }

  getInvoice(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/invoices/${id}`, { headers: this.getHeaders() });
  }

  getMyVendorInvoices(): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/vendors/${userId}/invoices`, {
      headers: this.getHeaders()
    }).pipe(map((res: any) => res?.data ?? res ?? []));
  }

  generateInvoiceFromOrder(orderId: number, paymentMethod: string = 'cash', extra?: Record<string, any>): Observable<any> {
    return this.http.post(`${this.apiUrl}/invoices`, {
      IdOrder: orderId,
      PaymentMethod: paymentMethod,
      ...extra
    }, { headers: this.getHeaders() });
  }

  // FIX (confirmé par équipe admin) : ni POST /invoices/{number}/pay ni
  // PATCH /invoices/{id}/mark-paid n'existent côté backend. On utilise le
  // PUT /invoices/{id} générique en posant Status='Paid' + PaidAt, comme
  // le fait InvoicesController::pay() côté client public.
  markInvoicePaid(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/invoices/${id}`, {
      Status: 'Paid',
      PaidAt: new Date().toISOString(),
    }, { headers: this.getHeaders() });
  }

  cancelInvoice(number: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/invoices/${number}/cancel`, {}, { headers: this.getHeaders() });
  }

  // ⚠️ Route non confirmée côté backend — pas d'endpoint dédié /invoices/lookup.
  // Utilisée en attendant comme une liste légère (per_page élevé) pour
  // peupler un select/dropdown (orders-admin : facture liée à une commande).
  getInvoicesLookup(): Observable<any> {
    return this.http.get(`${this.apiUrl}/invoices`, {
      headers: this.getHeaders(),
      params: { per_page: 1000 }
    });
  }

  deleteInvoice(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/invoices/${id}`, { headers: this.getHeaders() });
  }

  downloadInvoicePdf(idInvoice: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/invoices/${idInvoice}/pdf`, {
      headers: this.getHeaders(),
      responseType: 'blob' as 'json'
    }) as unknown as Observable<Blob>;
  }
}