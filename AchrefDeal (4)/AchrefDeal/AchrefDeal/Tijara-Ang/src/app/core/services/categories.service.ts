import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : categories-admin, boutique-list, annonces-user/ent,
 * products-ent, my-products-user, public-layout, dashboard-user, listing.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  // ─── Lecture publique ───────────────────────────────────────────────
  getCategories(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories`, { params }).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getCategoriesRoots(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories-roots`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getCategoryChildren(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories/${id}/children`);
  }

  getCategory(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories/${id}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  // ─── Admin ────────────────────────────────────────────────────────────
  getCategoriesAdmin(params: any = {}): Observable<any> {
    return this.getCategories({ per_page: 200, ...params });
  }

  createCategory(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/categories`, data, { headers: this.getHeaders() });
  }

  updateCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/categories/${id}`, data, { headers: this.getHeaders() });
  }

  // FIX (confirmé par équipe admin) : le backend (CategoriesController@store/update)
  // n'accepte l'image QUE sous forme de fichier uploadé ($request->hasFile('Image')) —
  // une simple URL texte est ignorée ($request->except('Image')). On passe donc par
  // FormData/multipart dès qu'un fichier est sélectionné dans le formulaire.
  createCategoryWithImage(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/categories`, formData, { headers: this.getAuthHeadersOnly() });
  }

  // Laravel ne parse pas les fichiers sur une vraie requête PUT multipart :
  // on POST avec un champ _method=PUT (method spoofing standard Laravel).
  updateCategoryWithImage(id: number, formData: FormData): Observable<any> {
    formData.append('_method', 'PUT');
    return this.http.post(`${this.apiUrl}/categories/${id}`, formData, { headers: this.getAuthHeadersOnly() });
  }

  // FIX (confirmé par équipe admin) : envoyer 0/1 explicite plutôt qu'un
  // booléen JS — plus fiable avec la validation/colonne backend.
  toggleCategory(id: number): Observable<any> {
    return this.getCategory(id).pipe(
      switchMap((cat: any) => {
        const newActive = cat?.Active ? 0 : 1;
        return this.updateCategory(id, { Active: newActive });
      })
    );
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${id}`, { headers: this.getHeaders() });
  }

  // ─── Features dynamiques par catégorie ───────────────────────────────
  // A CONFIRMER : quels composants consomment cette méthode et sous quelle
  // forme exacte, pour supprimer le doublon nameFr/TitleFeature une fois
  // que ce sera clarifié — actuellement les deux coexistent par prudence.
  getCategoryFeatures(categId: number): Observable<any[]> {
    return forkJoin({
      links: this.http.get<any>(`${this.apiUrl}/feature-categories`, {
        headers: this.getHeaders(),
        params: { IdCategory: categId, per_page: 100 } as any
      }),
      features: this.http.get<any>(`${this.apiUrl}/features`, {
        headers: this.getHeaders(),
        params: { per_page: 200 } as any
      })
    }).pipe(
      map(({ links, features }) => {
        const linkData: any[] = links?.data ?? links ?? [];
        const featureData: any[] = features?.data ?? features ?? [];
        const featureMap = new Map(featureData.map((f: any) => [f.IdFeature, f]));

        return linkData
          .map((l: any) => featureMap.get(l.IdFeature))
          .filter((f: any) => f != null)
          .map((feat: any) => ({
            ...feat,
            id: feat.IdFeature,
            nameFr: feat.TitleFeature ?? 'Champ',
            inputType: 'text'
          }));
      }),
      catchError(() => of([]))
    );
  }
}