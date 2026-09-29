import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class WinnersService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  private getHeaders(): HttpHeaders {
    const currentUser = localStorage.getItem('currentUser');
    let token = '';
    if (currentUser) { try { token = JSON.parse(currentUser).token || ''; } catch {} }
    return new HttpHeaders({ 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) });
  }

  constructor(private http: HttpClient) {}

  getWinners(params: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/winners`, { headers: this.getHeaders(), params });
  }

  // Manquait : nécessaire pour rafraîchir une ligne après tirage (show()).
  getWinner(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/winners/${id}`, { headers: this.getHeaders() });
  }

  // NOUVEAU — source de vérité pour "ce prize a-t-il déjà un gagnant tiré au
  // sort ?". Ne pas se fier à Prizes.idUser seul (PrizesController::store
  // l'exige déjà à la création du prize, avant tout tirage réel) : ici on
  // vérifie l'existence effective d'une ligne Winners pour ce IdPrize.
  // WinnersController::index accepte IdPrize comme filtre, donc un seul
  // appel ciblé suffit (pas besoin de cache/liste complète comme pour
  // PrizesService.getAllPrizes()).
  getWinnerForPrize(idPrize: number): Observable<any> {
    if (!idPrize) return of(null);
    return this.getWinners({ IdPrize: idPrize, per_page: 1 }).pipe(
      map((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        return list[0] ?? null;
      })
    );
  }

  // POST /winners ne prend QUE IdPrize (voir WinnersController::store) :
  // le back tire lui-même l'IdUser parmi les acheteurs du deal.
  createWinner(idPrize: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/winners`, { IdPrize: idPrize }, { headers: this.getHeaders() });
  }

  // Manquait : utile si l'admin doit corriger un tirage (WinnersController::update accepte du data libre côté back).
  updateWinner(id: number, data: { IdPrize?: number; IdUser?: number; DateWin?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/winners/${id}`, data, { headers: this.getHeaders() });
  }

  deleteWinner(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/winners/${id}`, { headers: this.getHeaders() });
  }
}