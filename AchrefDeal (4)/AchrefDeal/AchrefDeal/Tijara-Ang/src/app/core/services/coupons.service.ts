import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ Backend confirmé (CouponsController::index) : searchable=[Title,Description,
// NumberOfCoupon], filterable=[Used,Active], ranges=[DateStart,DateEnd,Price,CreatedAt], paginate().
@Injectable({ providedIn: 'root' })
export class CouponsService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) { try { token = JSON.parse(currentUser).token || ''; } catch {} }
    return new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) });
  }
  constructor(private http: HttpClient) {}
  getCoupons(params: any = {}): Observable<any> { return this.http.get(`${this.apiUrl}/coupons`, { params }); }
  createCoupon(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/coupons`, data, { headers: this.getHeaders() }); }
  updateCoupon(id: number, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/coupons/${id}`, data, { headers: this.getHeaders() }); }
  deleteCoupon(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/coupons/${id}`, { headers: this.getHeaders() }); }
}
