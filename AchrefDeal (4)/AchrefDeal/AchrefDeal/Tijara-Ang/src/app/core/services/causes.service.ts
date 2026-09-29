import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

// ✅ Backend confirmé (CausesController::index) : searchable=[TitleCauseEn,
// TitleCauseAr,TitleCauseFr], filterable=[GroupName,Active], paginate().
// ⚠️ Le frontend filtrait par "type" en local — le vrai champ backend
// équivalent est GroupName, pas "type".
@Injectable({ providedIn: 'root' })
export class CausesService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) { try { token = JSON.parse(currentUser).token || ''; } catch {} }
    return new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) });
  }
  constructor(private http: HttpClient) {}
  getCauses(params: any = {}): Observable<any> { return this.http.get(`${this.apiUrl}/causes`, { params }); }
  createCause(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/causes`, data, { headers: this.getHeaders() }); }
  updateCause(id: number, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/causes/${id}`, data, { headers: this.getHeaders() }); }
  deleteCause(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/causes/${id}`, { headers: this.getHeaders() }); }
}
