import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const IA_API = 'http://localhost:5001/api/ia';

@Injectable({ providedIn: 'root' })
export class IaApiService {

  constructor(private http: HttpClient) {}

  // ── Stats ─────────────────────────────────────────────────
  getOverview(): Observable<any> {
    return this.http.get(`${IA_API}/stats/overview`);
  }

  getProductsPurchases(): Observable<any[]> {
    return this.http.get<any[]>(`${IA_API}/stats/products/purchases`);
  }

  getProductsViews(): Observable<any[]> {
    return this.http.get<any[]>(`${IA_API}/stats/products/views`);
  }

  getCategoriesStats(): Observable<any[]> {
    return this.http.get<any[]>(`${IA_API}/stats/categories`);
  }

  // ── Recommandation ────────────────────────────────────────
  getRecommendations(userId: number): Observable<any> {
    return this.http.get(`${IA_API}/recommend/${userId}`);
  }

  getSimilarProducts(productId: number): Observable<any> {
    return this.http.get(`${IA_API}/recommend/similar/${productId}`);
  }

  // ── Prédiction ────────────────────────────────────────────
  getPrediction(productId: number): Observable<any> {
    return this.http.get(`${IA_API}/predict/${productId}`);
  }

  getAllPredictions(): Observable<any> {
    return this.http.get(`${IA_API}/predict/all`);
  }

  retrainModels(): Observable<any> {
    return this.http.post(`${IA_API}/recommend/retrain`, {});
  }
}
