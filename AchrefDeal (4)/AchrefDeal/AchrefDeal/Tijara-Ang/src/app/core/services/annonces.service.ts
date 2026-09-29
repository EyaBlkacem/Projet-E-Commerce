import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { UsersService } from './users.service';

@Injectable({ providedIn: 'root' })
export class AnnoncesService extends BaseApiService {

  constructor(http: HttpClient, private users: UsersService) { super(http); }

  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  // ─── Liste / détail ──────────────────────────────────────────────────
  getAnnonces(params?: any): Observable<any> {
    const requestedParams = { Active: 1, ...(params ?? {}) };
    const backendParams = requestedParams.__raw
      ? requestedParams.__raw
      : this.buildListingParams('ads', requestedParams);
    return this.http.get(`${this.apiUrl}/ads`, { params: backendParams });
  }

  getAnnonce(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads/${id}`);
  }

  // ─── Mes annonces (vendeur / user) ──────────────────────────────────
  getMyAnnonces(): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.getAnnoncesByUser(userId as number);
  }

  getAnnoncesByUser(idUser: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads`, {
      headers: this.getHeaders(),
      params: { IdUser: idUser, per_page: 50 } as any
    });
  }

  getMyAnnoncesPaged(opts: {
    page?: number;
    perPage?: number;
    search?: string;
    idCateg?: number | null;
    active?: 0 | 1 | null;
    priceMin?: number | null;
    priceMax?: number | null;
  }): Observable<any> {
    const userId = this.getCurrentUserId();
    const params: any = {
      IdUser: userId,
      page: opts.page ?? 1,
      per_page: opts.perPage ?? 50
    };
    if (opts.search)           params.search = opts.search;
    if (opts.idCateg != null)  params.IdCateg = opts.idCateg;
    if (opts.active != null)   params.Active = opts.active;
    if (opts.priceMin != null) params.PriceAd_min = opts.priceMin;
    if (opts.priceMax != null) params.PriceAd_max = opts.priceMax;

    return this.http.get(`${this.apiUrl}/ads`, { headers: this.getHeaders(), params });
  }

  // ─── Création / édition / suppression ───────────────────────────────
  createAnnonce(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ads`, data, { headers: this.getHeaders() });
  }

  updateAnnonce(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ads/${id}`, data, { headers: this.getHeaders() });
  }

  // FIX (confirmé par équipe admin): pas de route /admin/ads/{id} côté backend,
  // la route réelle est PUT /ads/{id}
  updateAnnonceAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/ads/${id}`, data, { headers: this.getHeaders() });
  }

  deleteAnnonce(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ads/${id}`, { headers: this.getHeaders() });
  }

  getAnnonceFacets(params?: { categId?: string | number; search?: string }): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/annonces/facets`, { params: params as any });
  }

  createAnnonceWithImage(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/ads`, formData, { headers: this.getAuthHeadersOnly() });
  }

  // FIX (confirmé par équipe admin): /admin/ads/{id}/media n'existe pas en tant
  // que route distincte — c'est la même route que /ads/{id}/media.
  // Fusion de l'ancien addAnnonceMedia + addAnnonceImageAdmin en une seule méthode,
  // qui accepte maintenant un ou plusieurs fichiers (comme côté admin).
  addAnnonceImageAdmin(id: number, files: File | File[]): Observable<any> {
    const formData = new FormData();
    const list = Array.isArray(files) ? files : [files];
    list.forEach(f => formData.append('ImageAd[]', f));
    return this.http.post(`${this.apiUrl}/ads/${id}/media`, formData, {
      headers: this.getAuthHeadersOnly()
    });
  }

  // Alias conservé pour compatibilité si addAnnonceMedia est déjà appelé ailleurs
  // dans le code (même route, même comportement que addAnnonceImageAdmin).
  addAnnonceMedia(id: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/ads/${id}/media`, formData, {
      headers: this.getAuthHeadersOnly()
    });
  }

  // FIX (confirmé par équipe admin): /admin/ads/{id}/photos → /ads/{id}/photos
  removeAnnonceImageAdmin(id: number, index: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ads/${id}/photos`, {
      headers: this.getHeaders(),
      params: { index: index as any },
    });
  }

  // ─── Likes annonces ──────────────────────────────────────────────────
  toggleLike(id: number): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/ad-likes`, {
      headers: this.getHeaders(),
      params: { IdAd: id, IdUser: userId as any, per_page: 1 } as any
    }).pipe(
      switchMap((res: any) => {
        const list = res?.data ?? res ?? [];
        const existing = Array.isArray(list) ? list[0] : null;

        if (existing) {
          return this.http.delete(`${this.apiUrl}/ad-likes/${existing.IdLike}`, { headers: this.getHeaders() })
            .pipe(map(() => ({ liked: false })));
        } else {
          return this.http.post(`${this.apiUrl}/ad-likes`, { IdAd: id, IdUser: userId }, { headers: this.getHeaders() })
            .pipe(map(() => ({ liked: true })));
        }
      })
    );
  }

  getMyAdLikes(): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/ad-likes`, {
      headers: this.getHeaders(),
      params: { IdUser: userId as any, per_page: 50 } as any
    });
  }

  // ─── Commentaires ────────────────────────────────────────────────────
  getComments(id: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/ad-comments`, {
      headers: this.getHeaders(),
      params: { IdAd: id, per_page: 50 } as any
    }).pipe(
      switchMap((res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const comments = Array.isArray(raw) ? raw : [];

        const uniqueUserIds = Array.from(new Set(comments.map(c => c.IdUser).filter(Boolean)));
        if (uniqueUserIds.length === 0) {
          return of(comments.map(c => this.mapAdComment(c, null)));
        }

        const userRequests: Record<string, Observable<any>> = {};
        uniqueUserIds.forEach(uid => {
          userRequests[uid] = this.users.getUserById(uid).pipe(map((u: any) => u?.data ?? u));
        });

        return forkJoin(userRequests).pipe(
          map((usersById: Record<string, any>) =>
            comments.map(c => this.mapAdComment(c, usersById[c.IdUser] ?? null))
          )
        );
      })
    );
  }

  addComment(id: number, content: string): Observable<any> {
    const userId = this.getCurrentUserId();
    let currentUserName = 'Vous';
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const u = cu?.user ?? cu;
      currentUserName = [u?.FirstName, u?.LastName].filter(Boolean).join(' ') || u?.Username || currentUserName;
    } catch {}

    return this.http.post<any>(`${this.apiUrl}/ad-comments`,
      { IdAd: id, IdUser: userId, Content: content },
      { headers: this.getHeaders() }
    ).pipe(
      map((created: any) => this.mapAdComment(created?.data ?? created, { FirstName: currentUserName, LastName: '' }))
    );
  }

  // ─── Admin modération annonces ────────────────────────────────────────
  getAdminAnnonces(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/ads`, { headers: this.getHeaders(), params });
  }

  approveAnnonce(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/ads/${id}/activate`, { Active: true }, { headers: this.getHeaders() });
  }

  rejectAnnonce(id: number, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/ads/${id}/activate`, { Active: false }, { headers: this.getHeaders() });
  }
}