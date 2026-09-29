import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { BoostPack, BoostStatus, PremiumPlan, PremiumSubscription, PremiumStatus } from '../models/boost-premium.models';

/**
 * Utilisé par : boost-packs-admin (via admin-generic), boost-packs-ent,
 * premium-ent, topbar-entreprise, index (landing), listing (landing),
 * detail (landing).
 */
@Injectable({ providedIn: 'root' })
export class BoostPremiumService extends BaseApiService {

  constructor(http: HttpClient) { super(http); }

  private mapBoostPack(raw: any): BoostPack {
    return {
      id: +(raw.IdBoost ?? 0),
      title: raw.Title ?? '',
      price: +(raw.Price ?? 0),
      discount: +(raw.Discount ?? 0),
      maxDuration: +(raw.MaxDuration ?? 0),
      sliders: !!raw.Sliders,
      sideBar: !!raw.SideBar,
      footer: !!raw.Footer,
      relatedPost: !!raw.RelatedPost,
      firstLogin: !!raw.FirstLogin,
      links: !!raw.Links,
      active: !!raw.Active,
    };
  }

  private mapBoostStatus(raw: any): BoostStatus {
    const b = raw?.boost;
    return {
      isBoosted: !!raw?.is_boosted,
      boost: b ? {
        id: b.IdProductBoost ?? b.IdAdBoost ?? b.id,
        startDate: b.StartDate,
        endDate: b.EndDate,
        active: !!b.Active,
        pack: b.pack ? this.mapBoostPack(b.pack) : null,
      } : null,
    };
  }

  getPublicBoostPacks(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/boost-ads-packs`, {
      headers: this.getHeaders(),
      params: { Active: 1, per_page: 50 } as any
    }).pipe(
      map((res: any) => res?.data ?? res ?? [])
    );
  }

  getBoostPacks(): Observable<BoostPack[]> {
    return this.getPublicBoostPacks().pipe(
      map((list: any[]) => (list || []).map(p => this.mapBoostPack(p)))
    );
  }

  // ─── Résolution boost en masse pour une liste (grilles publiques) ──
  resolveBoostStatuses(type: 'products' | 'ads', ids: number[]): Observable<Record<number, boolean>> {
    if (!ids.length) return of({});
    const requests = ids.map(id =>
      (type === 'products' ? this.getProductBoostStatus(id) : this.getAdBoostStatus(id)).pipe(
        map((status: BoostStatus) => ({ id, isBoosted: status.isBoosted })),
        catchError(() => of({ id, isBoosted: false }))
      )
    );
    return forkJoin(requests).pipe(
      map((results: { id: number; isBoosted: boolean }[]) => {
        const out: Record<number, boolean> = {};
        results.forEach(r => { out[r.id] = r.isBoosted; });
        return out;
      })
    );
  }

  // Variante qui conserve le BoostStatus complet (boost.pack.sliders/footer/sideBar)
  // pour savoir SUR QUELS emplacements un item boosté doit apparaître.
  // Limite connue : 1 requête HTTP par id — à remplacer par un endpoint bulk
  // côté backend si ça devient un problème de perf sur de grosses listes.
  resolveBoostStatusesDetailed(type: 'products' | 'ads', ids: number[]): Observable<Record<number, BoostStatus>> {
    if (!ids.length) return of({});
    const requests = ids.map(id =>
      (type === 'products' ? this.getProductBoostStatus(id) : this.getAdBoostStatus(id)).pipe(
        map((status: BoostStatus) => ({ id, status })),
        catchError(() => of({ id, status: { isBoosted: false, boost: null } as BoostStatus }))
      )
    );
    return forkJoin(requests).pipe(
      map((results: { id: number; status: BoostStatus }[]) => {
        const out: Record<number, BoostStatus> = {};
        results.forEach(r => { out[r.id] = r.status; });
        return out;
      })
    );
  }

  getProductBoostStatus(idProduct: number): Observable<BoostStatus> {
    return this.http.get(`${this.apiUrl}/products/${idProduct}/boost/status`, { headers: this.getHeaders() })
      .pipe(map((res: any) => this.mapBoostStatus(res)));
  }

  getAdBoostStatus(idAd: number): Observable<BoostStatus> {
    return this.http.get(`${this.apiUrl}/ads/${idAd}/boost/status`, { headers: this.getHeaders() })
      .pipe(map((res: any) => this.mapBoostStatus(res)));
  }

  boostProduct(idProduct: number, idBoost: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/${idProduct}/boost`, { IdBoost: idBoost }, { headers: this.getHeaders() });
  }

  boostAd(idAd: number, idBoost: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/ads/${idAd}/boost`, { IdBoost: idBoost }, { headers: this.getHeaders() });
  }

  removeProductBoost(idProduct: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${idProduct}/boost`, { headers: this.getHeaders() });
  }

  removeAdBoost(idAd: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ads/${idAd}/boost`, { headers: this.getHeaders() });
  }

  // ─── Premium ────────────────────────────────────────────
  private mapPremiumPlan(raw: any): PremiumPlan {
    return {
      id: +(raw.IdPremiumPlan ?? 0),
      name: raw.Name ?? '',
      slug: raw.Slug ?? '',
      durationMonths: +(raw.DurationMonths ?? 0),
      price: +(raw.Price ?? 0),
      currency: raw.Currency ?? 'TND',
      active: !!raw.Active,
    };
  }

  private mapPremiumSubscription(raw: any): PremiumSubscription | null {
    if (!raw) return null;
    return {
      id: raw.IdPremiumSubscription,
      idUser: raw.IdUser,
      idPremiumPlan: raw.IdPremiumPlan,
      idPayment: raw.IdPayment,
      price: +raw.Price,
      currency: raw.Currency,
      startDate: raw.StartDate,
      endDate: raw.EndDate,
      status: raw.Status,
      paymentStatus: raw.PaymentStatus,
      cancelledAt: raw.CancelledAt,
      plan: raw.plan ? this.mapPremiumPlan(raw.plan) : undefined,
    };
  }

  private mapPremiumStatus(res: any): PremiumStatus {
    const d = res?.data ?? res;
    return {
      idUser: d?.IdUser,
      isPremium: !!d?.is_premium,
      premiumStartedAt: d?.premium_started_at ?? null,
      premiumExpiry: d?.premium_expiry ?? null,
      subscription: this.mapPremiumSubscription(d?.subscription),
    };
  }

  getPremiumPlans(): Observable<PremiumPlan[]> {
    return this.http.get(`${this.apiUrl}/premium/plans`).pipe(
      map((res: any) => (res?.data ?? []).map((p: any) => this.mapPremiumPlan(p)))
    );
  }

  getPremiumStatus(): Observable<PremiumStatus> {
    return this.http.get(`${this.apiUrl}/premium/status`, { headers: this.getHeaders() })
      .pipe(map((res: any) => this.mapPremiumStatus(res)));
  }

  subscribePremium(idPlan: number, method: string = 'wallet'): Observable<any> {
    return this.http.post(`${this.apiUrl}/premium/subscribe`, { IdPremiumPlan: idPlan, Method: method }, { headers: this.getHeaders() });
  }

  activatePremiumSubscription(idSubscription: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/premium/${idSubscription}/activate`, {}, { headers: this.getHeaders() });
  }

  cancelPremiumSubscription(idSubscription: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/premium/${idSubscription}/cancel`, {}, { headers: this.getHeaders() });
  }

  getPremiumHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/premium/history`, { headers: this.getHeaders() })
      .pipe(map((res: any) => (res?.data?.data ?? res?.data ?? []).map((s: any) => this.mapPremiumSubscription(s))));
  }
}