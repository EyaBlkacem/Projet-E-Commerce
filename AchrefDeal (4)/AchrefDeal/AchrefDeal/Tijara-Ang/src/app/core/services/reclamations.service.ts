import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { UsersService } from './users.service';

/**
 * Non listé explicitement dans un composant fourni, mais consommé via
 * dashboard-user (getMyTrackedReclamationsResolved). Isolé ici par
 * cohérence fonctionnelle plutôt que noyé dans OrdersService.
 *
 * ✅ Comparé à la version admin reçue en parallèle : celle-ci reste la
 * référence — elle est plus complète (tracking, résolution des noms
 * d'utilisateurs) et plus sûre sur createReclamation() (payload filtré
 * plutôt qu'envoyé brut).
 */
@Injectable({ providedIn: 'root' })
export class ReclamationsService extends BaseApiService {

  constructor(http: HttpClient, private users: UsersService) { super(http); }

  get assetBaseUrl(): string {
    return this.apiUrl.replace(/\/api\/?$/, '');
  }

  getReclamations(params: any = {}): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/reclamations`, {
      headers: this.getHeaders(),
      params: { per_page: 50, ...params } as any
    }).pipe(map((res: any) => res?.data ?? res ?? []));
  }

  getReclamation(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reclamations/${id}`, { headers: this.getHeaders() });
  }

  // Champs volontairement filtrés : IdUser, date et statut sont déterminés
  // par Laravel à partir du token, pas envoyés par le front.
  createReclamation(data: any): Observable<any> {
    const payload = {
      IdCause: data?.IdCause,
      Subject: data?.Subject,
      Description: data?.Description,
    };
    return this.http.post(`${this.apiUrl}/reclamations`, payload, { headers: this.getHeaders() }).pipe(
      tap((res: any) => {
        const id = res?.data?.IdReclamation ?? res?.IdReclamation ?? res?.id;
        if (id) this.trackReclamationId(id);
      })
    );
  }

  updateReclamation(id: number, data: any): Observable<any> {
    return this.updateReclamationStatus(id, data?.Status ?? data?.status);
  }

  updateReclamationStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/reclamations/${id}/status`, { Status: status }, { headers: this.getHeaders() });
  }

  replyToReclamation(id: number, adminReply: string, status?: string): Observable<any> {
    const body: any = { AdminReply: adminReply };
    if (status) body.Status = status;
    return this.http.patch(`${this.apiUrl}/reclamations/${id}/reply`, body, { headers: this.getHeaders() });
  }

  private get myReclamationIdsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `tijara_reclamation_ids_${userId}` : 'tijara_reclamation_ids_guest';
  }

  private trackReclamationId(id: number): void {
    try {
      const raw = localStorage.getItem(this.myReclamationIdsKey);
      const ids: number[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(this.myReclamationIdsKey, JSON.stringify(ids));
      }
    } catch { /* ignore */ }
  }

  getMyReclamations(params: any = {}): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/my-reclamations`, {
      headers: this.getHeaders(),
      params: { per_page: 50, ...params } as any
    }).pipe(map((res: any) => res?.data ?? []));
  }

  // Conservée pour compat : ancien nom utilisé par dashboard-user.
  getMyTrackedReclamations(): Observable<any[]> {
    return this.getMyReclamations();
  }

  getMyTrackedReclamationsResolved(): Observable<any[]> {
    return this.getMyTrackedReclamations().pipe(
      switchMap((reports: any[]) => {
        if (reports.length === 0) return of([]);

        const uniqueUserIds = Array.from(new Set(reports.map(r => r.IdUser).filter(Boolean)));
        if (uniqueUserIds.length === 0) {
          return of(reports.map(r => this.mapReportToReclamation(r, null)));
        }

        const userRequests: Record<string, Observable<any>> = {};
        uniqueUserIds.forEach(uid => {
          userRequests[uid] = this.users.getUserById(uid).pipe(
            map((u: any) => u?.data ?? u),
            catchError(() => of(null))
          );
        });

        return forkJoin(userRequests).pipe(
          map((usersById: Record<string, any>) =>
            reports.map(r => this.mapReportToReclamation(r, usersById[r.IdUser] ?? null))
          )
        );
      })
    );
  }

  private mapReportToReclamation(r: any, user: any | null): any {
    const fullName = user
      ? ([user.FirstName, user.LastName].filter(Boolean).join(' ') || user.Username)
      : null;
    return {
      id: `REC-${r.IdReclamation ?? r.id}`,
      apiId: r.IdReclamation ?? r.id,
      user: fullName || `Utilisateur #${r.IdUser ?? '?'}`,
      email: user?.Email ?? '',
      role: user?.IdRole === 2 ? 'Vendeur' : 'Client',
      sujet: r.Subject ?? '',
      message: r.Description ?? '',
      date: r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString('fr-FR') : '',
      statut: r.Status || 'open',
      raw: r
    };
  }
}