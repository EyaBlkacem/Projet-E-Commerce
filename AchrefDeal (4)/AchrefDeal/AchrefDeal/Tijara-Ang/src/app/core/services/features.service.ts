import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/**
 * Service dédié aux caractéristiques de catégorie (page "Caractéristiques"
 * de l'admin) — 3 ressources Laravel réelles : Features (le catalogue),
 * FeatureCategories (liaison catégorie <-> caractéristique), FeaturesValues
 * (les valeurs possibles pour chaque caractéristique).
 */
@Injectable({ providedIn: 'root' })
export class FeaturesService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  private readonly FETCH_ALL_HARD_PAGE_CAP = 50;

  // Récupère toutes les pages d'une liste, car le backend plafonne
  // silencieusement per_page à 50 (un per_page:200 était ignoré et
  // tronquait la liste sans erreur visible).
  private fetchAllPages(callFactory: (page: number) => Observable<any>): Observable<any[]> {
    const HARD_PAGE_CAP = this.FETCH_ALL_HARD_PAGE_CAP;
    return new Observable<any[]>(subscriber => {
      const collected: any[] = [];
      let currentPage = 1;
      let knownTotal: number | null = null;

      const extractRaw = (r: any): any[] => {
        const isPaginatedShape = !Array.isArray(r) && r && typeof r === 'object' && 'data' in r;
        if (isPaginatedShape) {
          if (typeof r.total === 'number') knownTotal = r.total;
          return r.data || [];
        }
        return Array.isArray(r) ? r : [];
      };

      const fetchNext = () => {
        if (currentPage > HARD_PAGE_CAP) { subscriber.next(collected); subscriber.complete(); return; }
        if (knownTotal !== null && collected.length >= knownTotal) { subscriber.next(collected); subscriber.complete(); return; }

        callFactory(currentPage).subscribe({
          next: (r: any) => {
            const raw = extractRaw(r);
            if (raw.length === 0) { subscriber.next(collected); subscriber.complete(); return; }
            collected.push(...raw);
            currentPage++;
            if (knownTotal !== null && collected.length >= knownTotal) {
              subscriber.next(collected);
              subscriber.complete();
            } else {
              fetchNext();
            }
          },
          error: () => { subscriber.next(collected); subscriber.complete(); }
        });
      };

      fetchNext();
    });
  }

  // ─── Features (le catalogue des caractéristiques) ────────
  getFeatures(params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-delà de 50 côté backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/features`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }

  getFeature(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/features/${id}`, { headers: this.getHeaders() });
  }

  createFeature(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/features`, data, { headers: this.getHeaders() });
  }

  updateFeature(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/features/${id}`, data, { headers: this.getHeaders() });
  }

  deleteFeature(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/features/${id}`, { headers: this.getHeaders() });
  }

  // ⚠️ Pas de route "/toggle" côté Laravel — on récupère l'état actuel puis
  // on envoie un PUT /features/{id} avec le champ Active inversé (même
  // schéma que toggleCategory() dans categories.service.ts).
  toggleFeature(id: number): Observable<any> {
    return this.getFeature(id).pipe(
      switchMap((res: any) => {
        const current = res?.data ?? res;
        return this.updateFeature(id, { Active: current?.Active ? 0 : 1 });
      })
    );
  }

  // ─── FeatureCategories (liaison catégorie <-> caractéristique) ────
  getFeatureCategories(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/feature-categories`, { headers: this.getHeaders(), params });
  }

  linkFeatureToCategory(idCategory: number, idFeature: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/feature-categories`, { IdCategory: idCategory, IdFeature: idFeature }, { headers: this.getHeaders() });
  }

  unlinkFeatureFromCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/feature-categories/${id}`, { headers: this.getHeaders() });
  }

  // Récupère les caractéristiques réellement liées à une catégorie donnée
  // (résout la liaison FeatureCategories -> Features en 2 appels, comme
  // getCategoryFeatures() dans categories.service.ts).
  getCategoryFeatures(categId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/feature-categories`, {
      headers: this.getHeaders(),
      params: { IdCategory: categId, per_page: 100 }
    }).pipe(
      switchMap((linksRes: any) => {
        const links = linksRes?.data ?? linksRes ?? [];
        const featureIds: number[] = Array.from(new Set((links as any[]).map(l => l.IdFeature).filter((v: any) => v != null)));
        if (featureIds.length === 0) return of([]);
        return this.http.get<any>(`${this.apiUrl}/features`, {
          headers: this.getHeaders(),
          params: { per_page: 200 }
        }).pipe(
          map((featRes: any) => {
            const all = featRes?.data ?? featRes ?? [];
            return (all as any[]).filter(f => featureIds.includes(f.IdFeature));
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  // ─── FeaturesValues (valeurs possibles pour chaque caractéristique) ────
  getFeatureValues(params: any = {}): Observable<any> {
    // CORRIGE - per_page:200 tronquait silencieusement au-delà de 50 côté backend.
    return this.fetchAllPages((page) => this.http.get(`${this.apiUrl}/features-values`, { headers: this.getHeaders(), params: { ...params, per_page: 50, page } })).pipe(
      map((data: any[]) => ({ data }))
    );
  }

  createFeatureValue(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/features-values`, data, { headers: this.getHeaders() });
  }

  updateFeatureValue(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/features-values/${id}`, data, { headers: this.getHeaders() });
  }

  deleteFeatureValue(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/features-values/${id}`, { headers: this.getHeaders() });
  }
}