import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';


@Injectable({ providedIn: 'root' })
export class UsersVendorsService {

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

  private getCurrentUserId(): number | null {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;
    try {
      const id = JSON.parse(raw).id;
      return id != null ? Number(id) : null;
    } catch { return null; }
  }

  constructor(private http: HttpClient) {}

  getAdminAllUsers(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders(), params });
  }

  
  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  getAdminUserDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  updateAdminUser(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, data, { headers: this.getHeaders() });
  }

  deleteAdminUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  
  toggleAdminUser(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() }).pipe(
      switchMap((res: any) => {
        const current = res?.data ?? res;
        const newActive = current?.Active ? 0 : 1;
        return this.http.put(`${this.apiUrl}/users/${id}`, { Active: newActive }, { headers: this.getHeaders() });
      })
    );
  }

  
  toggleUserPremium(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() }).pipe(
      switchMap((res: any) => {
        const current = res?.data ?? res;
        const newPremium = current?.IsPremuim ? 0 : 1;
        return this.http.put(`${this.apiUrl}/users/${id}`, { IsPremuim: newPremium }, { headers: this.getHeaders() });
      })
    );
  }

 
  getAllVendors(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`, {
      headers: this.getHeaders(),
      params: { IdRole: 2, ...params },
    });
  }

  getPendingVendors(): Observable<any> {
    // "En attente" = comptes vendeur (IdRole=2) dont IsBusinessAccount n'est pas encore validé.
    return this.http.get(`${this.apiUrl}/users`, {
      headers: this.getHeaders(),
      params: { IdRole: 2, IsBusinessAccount: 0, per_page: 50 },
    });
  }

  
  approveVendor(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, { IsBusinessAccount: 1 }, { headers: this.getHeaders() });
  }

  rejectVendor(id: number, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, { IsBusinessAccount: 0 }, { headers: this.getHeaders() });
  }

  // ─── Admin profiles ──────────────────────────────────────
  
  getAdminVendorDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  getVendor(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendors/${id}`);
  }

  // ─── Vendor profile (public) ────────────────────────────
  
  getVendorProfile(vendorId: number): Observable<any> {
    return forkJoin({
      user: this.http.get<any>(`${this.apiUrl}/users/${vendorId}`, { headers: this.getHeaders() }).pipe(catchError(() => of(null))),
      products: this.http.get<any>(`${this.apiUrl}/products`, { headers: this.getHeaders(), params: { IdUser: vendorId, per_page: 100 } }).pipe(catchError(() => of({ data: [] }))),
      categories: this.http.get<any>(`${this.apiUrl}/categories`, { params: { per_page: 200 } }).pipe(catchError(() => of({ data: [] }))),
    }).pipe(
      map(({ user, products, categories }: { user: any; products: any; categories: any }) => {
        const u = user?.data ?? user;
        if (!u) throw new Error('Vendeur introuvable');
        const vendor = {
          id: u.IdUser,
          first_name: u.FirstName || '',
          last_name: u.LastName || '',
          username: u.Username || '',
          email: u.Email || '',
          phone: u.Telephone || '',
          profile_picture: u.ProfilePicture || '',
          is_verified: !!u.IsVerified,
          city: u.City || '',
         
          created_at: u.CreationDate || null,
        };
        const list = products?.data ?? products ?? [];
        const cats = categories?.data ?? categories ?? [];
       
        const productsWithCategory = (list as any[]).map(p => {
          const cat = (cats as any[]).find((c: any) => c.IdCateg === p.IdCateorie);
          return { ...p, category_name: cat?.TitleFr || '' };
        });
        return { vendor, products: productsWithCategory };
      })
    );
  }

  // ─── Vendors public ──────────────────────────────────────
  getVendors(params?: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/vendors`, { params });
  }

  // ─── Profil ─────────────────────────────────────────────
  
  updateProfile(data: any): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.put(`${this.apiUrl}/users/${myId}`, data, { headers: this.getHeaders() });
  }
}
