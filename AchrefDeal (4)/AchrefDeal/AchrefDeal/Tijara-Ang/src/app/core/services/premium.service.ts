import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({ providedIn: 'root' })
export class PremiumService {

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

  getPremiumPlans(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/premium/plans`, { headers: this.getHeaders() });
  }

  // ─── Premium (abonnements + plans) ───────────────────────
  getPremiumSubscriptions(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/premium/subscriptions`, { headers: this.getHeaders(), params });
  }

  getPendingRequestsCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/premium/subscriptions/pending-count`, { headers: this.getHeaders() });
  }

  activatePremiumSubscription(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/subscriptions/${id}/activate`, {}, { headers: this.getHeaders() });
  }

  cancelPremiumSubscription(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/subscriptions/${id}/cancel`, {}, { headers: this.getHeaders() });
  }

  expirePremiumSubscription(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/subscriptions/${id}/expire`, {}, { headers: this.getHeaders() });
  }

  createPremiumPlan(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/premium/plans`, data, { headers: this.getHeaders() });
  }

  updatePremiumPlan(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/premium/plans/${id}`, data, { headers: this.getHeaders() });
  }

  togglePremiumPlan(id: number, active: boolean): Observable<any> {
    const action = active ? 'activate' : 'deactivate';
    return this.http.patch(`${this.apiUrl}/admin/premium/plans/${id}/${action}`, {}, { headers: this.getHeaders() });
  }
}