import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * ✅ Backend confirmé (PrizesController::index) : searchable=[title,description],
 * filterable=[image,idUser,active], paginate().
 *
 * ✅ CORRIGÉ — createPrize() envoie désormais un vrai FormData (multipart),
 * car PrizesController::store() fait $request->file('image') et valide
 * 'image' => 'required|image|...'. Un Content-Type: application/json forcé
 * empêchait Laravel de recevoir le fichier (422 systématique).
 */
@Injectable({ providedIn: 'root' })
export class PrizesService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) { try { token = JSON.parse(currentUser).token || ''; } catch {} }
    return new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) });
  }

  // ✅ PAS de Content-Type ici : on laisse le navigateur générer le
  // "boundary" du multipart automatiquement. Le forcer casserait l'upload.
  private getMultipartHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) { try { token = JSON.parse(currentUser).token || ''; } catch {} }
    return new HttpHeaders(token ? { 'Authorization': `Bearer ${token}` } : {});
  }

  getPrizes(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/prizes`, { headers: this.getHeaders(), params });
  }

  // NOUVEAU - PrizesController::index n'accepte PAS IdDeal comme filtre
  // (filterable = image, idUser, active), mais il renvoie bien la colonne
  // IdDeal et charge la relation user. On récupère donc la première page
  // (MAX_PER_PAGE = 50 côté backend) une seule fois, on la met en cache,
  // et on filtre par IdDeal côté Angular.
  private prizesCache$: Observable<any[]> | null = null;

  private getAllPrizes(): Observable<any[]> {
    if (!this.prizesCache$) {
      this.prizesCache$ = this.http
        .get(`${this.apiUrl}/prizes`, { headers: this.getHeaders(), params: { per_page: 50 } as any })
        .pipe(
          map((res: any) => (Array.isArray(res) ? res : (res?.data ?? []))),
          shareReplay(1)
        );
    }
    return this.prizesCache$;
  }

  /** Vide le cache (à appeler après création/suppression d'un prize). */
  clearPrizesCache(): void { this.prizesCache$ = null; }

  getPrizeForDeal(idDeal: number): Observable<any> {
    if (!idDeal) return of(null);
    return this.getAllPrizes().pipe(
      map(list => list.find((p: any) => Number(p?.IdDeal) === Number(idDeal)) ?? null)
    );
  }

  // ✅ CORRIGÉ — accepte un FormData (image obligatoire côté backend).
  createPrize(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/prizes`, formData, { headers: this.getMultipartHeaders() });
  }

  updatePrize(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/prizes/${id}`, data, { headers: this.getHeaders() });
  }

  deletePrize(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/prizes/${id}`, { headers: this.getHeaders() });
  }
}