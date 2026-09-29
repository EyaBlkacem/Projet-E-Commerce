import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : boutique-list/detail, products-ent, product-detail(shop/ecommerce),
 * products-admin, product-detail-admin, listing, detail (landing), cart, sellers.
 *
 * ✅ CORRIGÉ (confirmé par l'équipe admin) : updateProductAdmin() utilisait
 * PUT /admin/products/{id} qui n'existe pas côté Laravel — bascule sur
 * PUT /products/{id}, comme updateProduct().
 *
 * ⚠️ CONFLIT NON RÉSOLU : le fichier reçu de l'admin appelle réellement
 * GET /products/facets, alors que ce commentaire indiquait que la route
 * n'existe pas côté backend (ProductsController sans méthode facets()).
 * Gardé en of([]) par prudence — À VÉRIFIER dans routes/api.php si la
 * route a été ajoutée depuis, avant de basculer sur le vrai appel HTTP.
 */
@Injectable({ providedIn: 'root' })
export class ProductsService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  // ─── Liste / détail ──────────────────────────────────────────────────
  getProducts(params?: any): Observable<any> {
    const requestedParams = { Active: 1, ...(params ?? {}) };
    const backendParams = requestedParams.__raw
      ? requestedParams.__raw
      : this.buildListingParams('products', requestedParams);
    return this.http.get(`${this.apiUrl}/products`, { params: backendParams, headers: this.getHeaders() });
  }

  getProduct(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/${id}`, { headers: this.getHeaders() });
  }

  // ─── Création / édition / suppression ───────────────────────────────
  createProduct(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/products`, data, { headers: this.getHeaders() });
  }

  updateProduct(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/products/${id}`, data, { headers: this.getHeaders() });
  }

  // ✅ Route corrigée : PUT /products/{id} (pas /admin/products/{id}, qui n'existe pas).
  updateProductAdmin(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/products/${id}`, data, { headers: this.getHeaders() });
  }

  toggleProductStatus(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/${id}`, { headers: this.getHeaders() }).pipe(
      switchMap((res: any) => {
        const current = res?.data ?? res;
        const newActive = current?.Active ? false : true;
        return this.http.patch(`${this.apiUrl}/products/${id}/activate`, { Active: newActive }, { headers: this.getHeaders() });
      })
    );
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}`, { headers: this.getHeaders() });
  }

  addProductMedia(id: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/${id}/media`, formData, {
      headers: this.getAuthHeadersOnly()
    });
  }

  // ⚠️ /products/facets n'existe PAS côté Laravel (ProductsController n'a
  // pas de méthode facets()) → un vrai appel renverrait un 404. C'est
  // volontaire : listing.component.ts a déjà un fallback local
  // buildFacetsFromLoadedItems() dans son bloc error. Ne pas "réparer" ici
  // sans backend — laisser tel quel. VOIR NOTE CONFLIT en haut du fichier.
  getProductFacets(params?: { categId?: string | number; search?: string }): Observable<any[]> {
    return of([]);
  }

  getMyProducts(): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.getProductsByUser(userId as number);
  }

  getProductsByUser(idUser: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/products`, {
      headers: this.getHeaders(),
      params: { IdUser: idUser, per_page: 50 } as any
    }).pipe(map((res: any) => res?.data ?? res ?? []));
  }

  // ─── Likes produits ──────────────────────────────────────────────────
  getMyProductLikes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/product-likes`, { headers: this.getHeaders() });
  }

  addProductLike(productId: number): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.post(`${this.apiUrl}/product-likes`, { IdProduct: productId, IdUser: userId }, { headers: this.getHeaders() });
  }

  removeProductLike(likeId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/product-likes/${likeId}`, { headers: this.getHeaders() });
  }

  // ─── Admin modération produits ────────────────────────────────────────
  getAdminAllProducts(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/products`, { headers: this.getHeaders(), params });
  }

  getAdminPendingProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/products`, {
      headers: this.getHeaders(),
      params: { Active: 0, per_page: 50 }
    });
  }

  approveProduct(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/products/${id}/activate`, { Active: true }, { headers: this.getHeaders() });
  }

  rejectProductAdmin(id: number, reason?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/products/${id}/activate`, { Active: false }, { headers: this.getHeaders() });
  }

  // DELETE /products/{id}/photos?index=  (route déjà existante côté Laravel,
  // il manquait juste le wrapper Angular).
  removeProductPhoto(id: number, index: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}/photos`, {
      headers: this.getHeaders(),
      params: { index },
    });
  }
}