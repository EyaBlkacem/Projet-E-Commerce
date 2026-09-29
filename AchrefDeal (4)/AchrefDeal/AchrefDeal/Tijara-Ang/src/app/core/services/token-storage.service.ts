import { Injectable } from '@angular/core';

const USER_KEY = 'currentUser';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  constructor() { }

  signOut(): void {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
      if (u?.id) localStorage.removeItem(`tijara_cart_${u.id}`);
    } catch {}
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('toast');
    localStorage.removeItem('tijara_cart');
    sessionStorage.clear();
  }

  public saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  public getToken(): string | null {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try { return JSON.parse(raw).token || null; } catch {}
    }
    return null;
  }

  public saveUser(user: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public getUser(): any {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return {};
  }
}
