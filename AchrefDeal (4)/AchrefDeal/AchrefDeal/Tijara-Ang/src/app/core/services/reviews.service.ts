import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

// ✅ Service dédié au domaine « reviews » — extrait de tijara-api.service.ts
// à la demande de l'encadrant : chaque page/domaine a son propre service,
// pas tout regroupé dans un seul fichier géant.
//
// Autonome : contient sa propre gestion de l'URL de base et des headers
// d'authentification, pour ne dépendre d'aucun autre fichier — même
// approche que annonces.service.ts, products.service.ts, deals.service.ts,
// categories.service.ts.
@Injectable({ providedIn: 'root' })
export class ReviewsService {

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

  // ✅ Corrigé : POST /reviews avec TargetType/TargetId/IdUser/Rating/Comment
  // (pas /products/{id}/reviews, et pas les champs rating/comment minuscules
  // seuls — le backend attend le PascalCase habituel).
  addReview(productId: number, data: { rating: number; comment?: string }): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.post(`${this.apiUrl}/reviews`, {
      TargetType: 'product',
      TargetId: productId,
      IdUser: myId,
      Rating: data.rating,
      Comment: data.comment || '',
    }, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : POST /reviews avec TargetType/TargetId/IdUser/Rating/Comment
  // dans le corps (pas en query string, et pas rating/comment minuscules seuls).
  addReviewGeneric(type: string, targetId: number, payload: { rating: number; comment?: string }): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.post(`${this.apiUrl}/reviews`, {
      TargetType: type,
      TargetId: targetId,
      IdUser: myId,
      Rating: payload.rating,
      Comment: payload.comment || '',
    }, { headers: this.getHeaders() });
  }

  // ✅ Corrigé : DELETE /reviews/{id} directement (pas de sous-ressource
  // /products/{productId}/reviews/{id} côté Laravel).
  deleteReview(productId: number, reviewId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${reviewId}`, { headers: this.getHeaders() });
  }

  deleteReviewGeneric(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reviews/${id}`, { headers: this.getHeaders() });
  }

  // ─── LOT 2 — Reviews ─────────────────────────────────────
  // ✅ Corrigé : champs réels TargetType/TargetId (PascalCase) au lieu de
  // type/targetId — voir ReviewsController::index (buildFilteredQuery sur
  // ['IdUser','TargetType','TargetId','Active']).
  // Renvoie directement le tableau `data` (pas l'objet de pagination Laravel
  // complet) car detail.component.ts assigne le résultat tel quel à
  // `reviews: any[]` et l'itère en `@for` — lui passer l'objet paginé
  // casserait le rendu (ce n'était pas le cas avant : le backend .NET
  // renvoyait probablement déjà un tableau brut).
  getReviews(type: string, targetId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/reviews`, { params: { TargetType: type, TargetId: targetId, per_page: 100 } }).pipe(
      map((res: any) => res?.data ?? res ?? []),
      catchError(() => of([]))
    );
  }

  // ✅ Corrigé : /reviews/summary n'existe pas — on calcule la moyenne et le
  // total côté Angular à partir de la liste filtrée (déjà scopée par
  // TargetType/TargetId ci-dessus, donc peu coûteux : quelques dizaines
  // d'avis par annonce/produit tout au plus).
  getReviewSummary(type: string, targetId: number): Observable<any> {
    return this.getReviews(type, targetId).pipe(
      map((res: any) => {
        const rows = res?.data ?? res ?? [];
        const count = rows.length;
        const average = count > 0 ? rows.reduce((s: number, r: any) => s + (+r.Rating || 0), 0) / count : 0;
        return { total: count, average: Math.round(average * 10) / 10 };
      }),
      catchError(() => of({ total: 0, average: 0 }))
    );
  }

  // ─── Reviews (générique, table `reviews` : TargetType/TargetId) ─────
  // ✅ Corrigé : /products/{id}/reviews n'existe pas côté Laravel — la
  // table `reviews` est générique (TargetType/TargetId), déjà exposée via
  // GET/POST/DELETE /reviews. On agrège ici stats + liste pour retrouver la
  // forme { reviews, stats } attendue par product-detail.component.ts.
  getProductReviews(productId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reviews`, {
      params: { TargetType: 'product', TargetId: productId, per_page: 100 } as any
    }).pipe(
      map((res: any) => {
        const raw = res?.data ?? res ?? [];
        const reviews = (raw as any[]).map(r => ({
          id: r.IdReview ?? r.id,
          user_id: r.IdUser,
          rating: Number(r.Rating || 0),
          comment: r.Comment || '',
          created_at: r.CreatedAt,
        }));
        const count = reviews.length;
        const average = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
        // Champs alignés EXACTEMENT sur product-detail.component.ts :
        // avg_rating (pas "average"), total, et r1..r5 = distribution par
        // étoile utilisée pour les barres de répartition des notes.
        const stats: any = { total: count, avg_rating: Math.round(average * 10) / 10 };
        for (let star = 1; star <= 5; star++) {
          stats[`r${star}`] = reviews.filter(r => Math.round(r.rating) === star).length;
        }
        return { reviews, stats };
      }),
      catchError(() => of({ reviews: [], stats: { total: 0, avg_rating: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 } }))
    );
  }

  // ✅ Corrigé : /reviews/my n'existe pas — filtre IdUser=moi sur /reviews.
  getMyReviews(): Observable<any> {
    const myId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/reviews`, { headers: this.getHeaders(), params: { IdUser: myId as any, per_page: 100 } });
  }

  addComment(id: number, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ad-comments`, { IdAd: id, Content: content }, { headers: this.getHeaders() });
  }

  getComments(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/ad-comments`, { params: { IdAd: id, per_page: 100 } });
  }
}
