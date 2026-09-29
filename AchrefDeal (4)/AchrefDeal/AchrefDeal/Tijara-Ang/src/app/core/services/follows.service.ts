import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { UsersService } from './users.service';

/**
 * Utilisé par : seller-details, profile-user, followers-ent.
 */
@Injectable({ providedIn: 'root' })
export class FollowsService extends BaseApiService {

  constructor(http: HttpClient, private users: UsersService) { super(http); }

  checkFollow(vendorId: number): Observable<any> {
    const userId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/user-follows`, {
      headers: this.getHeaders(),
      params: { IdUser: userId as any, IdVendor: vendorId as any }
    }).pipe(
      map((res: any) => {
        const list = res?.data ?? res ?? [];
        const match = Array.isArray(list) ? list[0] : null;
        return { following: !!match, followId: match?.id ?? match?.IdUserFollow ?? null };
      })
    );
  }

  toggleFollow(vendorId: number): Observable<any> {
    return this.checkFollow(vendorId).pipe(
      switchMap((status: any) => {
        if (status.following && status.followId) {
          return this.http.delete(`${this.apiUrl}/user-follows/${status.followId}`, { headers: this.getHeaders() })
            .pipe(map(() => ({ following: false })));
        } else {
          const userId = this.getCurrentUserId();
          return this.http.post(`${this.apiUrl}/user-follows`, { IdUser: userId, IdVendor: vendorId }, { headers: this.getHeaders() })
            .pipe(map(() => ({ following: true })));
        }
      })
    );
  }

  getMyFollows(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user-follows`, {
      headers: this.getHeaders(),
      params: { IdUser: this.getCurrentUserId() as any }
    });
  }

  getMyFollowers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user-follows`, {
      headers: this.getHeaders(),
      params: { IdVendor: this.getCurrentUserId() as any }
    });
  }

  getMyFollowersResolved(): Observable<{ total: number; followers: any[] }> {
    const vendorId = this.getCurrentUserId();
    return this.http.get<any>(`${this.apiUrl}/user-follows`, {
      headers: this.getHeaders(),
      params: { IdVendor: vendorId as any, per_page: 50 } as any
    }).pipe(
      switchMap((res: any) => {
        const raw: any[] = res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : [];
        const total = res?.total ?? list.length;

        const uniqueUserIds = Array.from(new Set(list.map(f => f.IdUser).filter(Boolean)));
        if (uniqueUserIds.length === 0) {
          return of({ total, followers: [] });
        }

        const userRequests: Record<string, Observable<any>> = {};
        uniqueUserIds.forEach(uid => {
          userRequests[uid] = this.users.getUserById(uid).pipe(map((u: any) => u?.data ?? u));
        });

        return forkJoin(userRequests).pipe(
          map((usersById: Record<string, any>) => ({
            total,
            followers: list.map(f => {
              const u = usersById[f.IdUser] ?? {};
              const fullName = [u.FirstName, u.LastName].filter(Boolean).join(' ') || u.Username || 'Utilisateur';
              return {
                id: f.IdFollow ?? f.IdUser,
                full_name: fullName,
                username: u.Username ?? '',
                email: u.Email ?? '',
                phone: u.Telephone ?? '',
                profile_picture: u.ProfilePicture ?? null,
                followed_at: f.CreatedAt ?? null,
              };
            })
          }))
        );
      })
    );
  }
}
