import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/**
 * Utilisé par : wishlist-user, annonces-user/ent, dashboard-user,
 * detail/listing (landing).
 */
@Injectable({ providedIn: 'root' })
export class WishlistService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  getWishlistAds(params?: any): Observable<any> {
    return this.getWishlist('ads-wishlist', params);
  }

  getWishlistDeals(params?: any): Observable<any> {
    return this.getWishlist('deals-wishlist', params);
  }

  getWishlistProducts(params?: any): Observable<any> {
    return this.getWishlist('product-wishlist', params);
  }

  addToWishlist(type: 'ads' | 'deals' | 'products', id: number): Observable<any> {
    const resource = type === 'products' ? 'product-wishlist' : `${type}-wishlist`;
    const targetField = type === 'ads' ? 'IdAd' : type === 'deals' ? 'IdDeal' : 'IdProduct';
    const payload: any = { IdUser: this.getCurrentUserId(), [targetField]: id };
    return this.http.post(`${this.apiUrl}/${resource}/add`, payload, { headers: this.getHeaders() });
  }

  removeFromWishlist(type: 'ads' | 'deals' | 'products', id: number): Observable<any> {
    const resource = type === 'products' ? 'product-wishlist' : `${type}-wishlist`;
    const targetField = type === 'ads' ? 'IdAd' : type === 'deals' ? 'IdDeal' : 'IdProduct';
    const params: any = { IdUser: this.getCurrentUserId(), [targetField]: id };
    return this.http.delete(`${this.apiUrl}/${resource}/remove`, { headers: this.getHeaders(), params });
  }

  checkWishlist(adId?: number, dealId?: number, productId?: number): Observable<any> {
    const userId = this.getCurrentUserId();
    if (!userId) return of({ ad_liked: false, deal_liked: false, product_liked: false });

    return forkJoin({
      ads: adId ? this.getWishlistAds({ IdAd: adId, per_page: 1 }) : of(null),
      deals: dealId ? this.getWishlistDeals({ IdDeal: dealId, per_page: 1 }) : of(null),
      products: productId ? this.getWishlistProducts({ IdProduct: productId, per_page: 1 }) : of(null),
    }).pipe(map(({ ads, deals, products }) => ({
      ad_liked: this.hasWishlistEntry(ads),
      deal_liked: this.hasWishlistEntry(deals),
      product_liked: this.hasWishlistEntry(products),
    })));
  }

  private getWishlist(resource: string, params?: any): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get(`${this.apiUrl}/${resource}`, {
      headers: this.getHeaders(),
      params: { ...(params ?? {}), ...(userId != null ? { IdUser: userId } : {}) }
    });
  }

  private hasWishlistEntry(response: any): boolean {
    const entries = Array.isArray(response) ? response : response?.data ?? [];
    return Array.isArray(entries) && entries.length > 0;
  }
}
