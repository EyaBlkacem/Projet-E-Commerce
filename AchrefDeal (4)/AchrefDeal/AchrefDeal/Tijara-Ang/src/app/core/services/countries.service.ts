import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ Backend confirmé (CountriesFullController::index) : searchable=[NameEN,NameFR,
// NameAR,NameDE,NameES,NameCH,NameRU,CodeCountry2,CodeCountry3,Flag,MAP,PhoneCode,
// Continent], filterable=[Active], paginate().
@Injectable({ providedIn: 'root' })
export class CountriesService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) { try { token = JSON.parse(currentUser).token || ''; } catch {} }
    return new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) });
  }
  constructor(private http: HttpClient) {}
  getCountries(params: any = {}): Observable<any> { return this.http.get(`${this.apiUrl}/countries`, { params }); }
  createCountry(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/countries`, data, { headers: this.getHeaders() }); }
  updateCountry(id: number, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/countries/${id}`, data, { headers: this.getHeaders() }); }
  deleteCountry(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/countries/${id}`, { headers: this.getHeaders() }); }
}
