import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
    constructor(private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const raw = localStorage.getItem('currentUser');
        if (raw) {
            try {
                const user = JSON.parse(raw);
                if (user?.token) { return true; }
            } catch {
                localStorage.removeItem('currentUser');
            }
        }
        // Non connecté → redirection login
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
