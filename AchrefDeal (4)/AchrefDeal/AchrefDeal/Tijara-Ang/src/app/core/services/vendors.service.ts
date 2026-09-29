import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : sellers, seller-details, vendors-admin, vendor-detail-admin,
 * dashboard-admin (approve/reject/pending vendors).
 */
@Injectable({ providedIn: 'root' })
export class VendorsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getVendors(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendors`, { params });
  }

  getVendor(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendors/${id}`);
  }

  getAdminVendorDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendors/${id}`, { headers: this.getHeaders() });
  }

  getPendingVendors(): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/vendors/pending`, { headers: this.getHeaders() });
  }

  getAllVendors(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/vendors`, { headers: this.getHeaders(), params });
  }

  approveVendor(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/vendors/${id}/approve`, {}, { headers: this.getHeaders() });
  }

  rejectVendor(id: number, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/vendors/${id}/reject`, { reason }, { headers: this.getHeaders() });
  }
}
