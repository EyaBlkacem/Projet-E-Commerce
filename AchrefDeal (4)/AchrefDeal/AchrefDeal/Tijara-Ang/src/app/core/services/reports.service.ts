import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : reports-admin.
 */
@Injectable({ providedIn: 'root' })
export class ReportsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getReportOverview(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/overview`, { headers: this.getHeaders() });
  }

  getSalesByMonth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/sales-by-month`, { headers: this.getHeaders() });
  }

  getTopProducts(limit = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/top-products`, { headers: this.getHeaders(), params: { limit } as any });
  }

  getTopCustomers(limit = 10): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/top-customers`, { headers: this.getHeaders(), params: { limit } as any });
  }
}
