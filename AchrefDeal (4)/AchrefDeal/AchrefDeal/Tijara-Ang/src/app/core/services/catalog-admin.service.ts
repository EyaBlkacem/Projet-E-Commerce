import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// ✅ Service dédié au domaine « catalog-admin » — extrait de tijara-api.service.ts
// à la demande de l'encadrant : chaque page/domaine a son propre service,
// pas tout regroupé dans un seul fichier géant.
//
// Autonome : contient sa propre gestion de l'URL de base et des headers
// d'authentification, pour ne dépendre d'aucun autre fichier — même
// approche que annonces.service.ts, products.service.ts, deals.service.ts,
// categories.service.ts.
@Injectable({ providedIn: 'root' })
export class CatalogAdminService {

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

  // ─── Admin catalog CRUD (helper générique) ───────────────
  // ⚠️ Il n'existe AUCUN préfixe "/admin/..." côté Laravel — chaque ressource
  // (cities, prizes, coupons, causes, countries, winners, brands,
  // boost-ads-packs…) est accessible sur son URL plate habituelle
  // (GET/POST/PUT/DELETE /{resource}), la distinction admin se fait par le
  // rôle du token, pas par l'URL. Utilisé par 9 pages admin (référentiels).
  adminList(path: string, params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/${path}`, { headers: this.getHeaders(), params });
  }

  adminCreate(path: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${path}`, payload, { headers: this.getHeaders() });
  }

  adminUpdate(path: string, id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${path}/${id}`, payload, { headers: this.getHeaders() });
  }

  // Headers SANS Content-Type : le navigateur doit poser lui-même le
  // boundary multipart/form-data pour un vrai upload de fichier.
  private multipartHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) {
      try { token = JSON.parse(currentUser).token || ''; } catch {}
    }
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  adminCreateMultipart(path: string, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/${path}`, formData, { headers: this.multipartHeaders() });
  }

  // Laravel ne parse pas un vrai PUT multipart (limitation PHP) : on POST
  // avec _method=PUT (method spoofing standard Laravel).
  adminUpdateMultipart(path: string, id: number, formData: FormData): Observable<any> {
    formData.append('_method', 'PUT');
    return this.http.post(`${this.apiUrl}/${path}/${id}`, formData, { headers: this.multipartHeaders() });
  }

  adminDelete(path: string, id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${path}/${id}`, { headers: this.getHeaders() });
  }

  // ⚠️ Pas de route "/toggle" générique côté Laravel non plus — ce helper
  // reste utilisable seulement si l'appelant construit lui-même l'URL complète
  // d'une vraie route toggle existante (ex: 'ads/12/activate').
  adminPatch(subPath: string, payload: any = {}): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${subPath}`, payload, { headers: this.getHeaders() });
  }

  // Alias de adminUpdate — utilisé par les composants (ex: DealsAdminComponent.saveEdit)
  // qui appellent `adminPut('deals', id, payload)`. Même comportement : PUT /{path}/{id}.
  adminPut(path: string, id: number, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${path}/${id}`, payload, { headers: this.getHeaders() });
  }

  // ─── Public catalog (admin → users/vendors) ──────────────
  // ⚠️ BACKEND REQUIS : GET /coupons n'est enregistrée QUE sous le
  // middleware ['auth:api','admin'] (routes/api.php Section 4 :
  // ->except(['show']), et 'show' n'est enregistrée nulle part ailleurs
  // non plus). Il n'existe donc AUCUNE route pour qu'un visiteur ou un
  // simple utilisateur consulte les coupons publics — seul un admin
  // connecté peut lister /coupons, et personne ne peut faire GET /coupons/{id}.
  // Cet appel échouera en 401/403 pour un utilisateur non-admin tant que
  // l'encadrant n'ajoute pas une route publique (ex: Section 1, ->only(['index','show'])
  // comme pour brands/prizes/winners). Fallback géré en catchError pour ne
  // pas casser l'écran coupons-user.
  getPublicCoupons(): Observable<any> {
    return this.http.get(`${this.apiUrl}/coupons`, { headers: this.getHeaders() }).pipe(
      catchError(() => of({ data: [] }))
    );
  }

  getPublicPrizes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/prizes`);
  }

  getPublicWinners(): Observable<any> {
    return this.http.get(`${this.apiUrl}/winners`);
  }
}