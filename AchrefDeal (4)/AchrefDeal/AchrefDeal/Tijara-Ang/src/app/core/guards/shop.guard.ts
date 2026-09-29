import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

/**
 * Guard : accès au shop (achat) autorisé pour les clients ET les vendeurs (achat B2B).
 * Seul l'admin est redirigé ailleurs.
 */
@Injectable({ providedIn: 'root' })
export class ShopGuard {
    constructor(private router: Router) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const raw = localStorage.getItem('currentUser');
        if (!raw) {
            this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
            return false;
        }
        try {
            const user = JSON.parse(raw);
            if (!user?.token) {
                this.router.navigate(['/auth/login']);
                return false;
            }
            const roleId = Number(user?.IdRole ?? user?.user?.IdRole);
            const role = roleId === 1 ? 'user' : roleId === 2 ? 'vendor' : roleId === 3 ? 'admin' : user.role;

            if (role === 'admin') {
                this.router.navigate(['/admin/reclamations']);
                return false;
            }
            // ✅ Client ET vendeur peuvent acheter (achat B2B pour le vendeur)
            return role === 'user' || role === 'vendor';
        } catch {
            localStorage.removeItem('currentUser');
            this.router.navigate(['/auth/login']);
            return false;
        }
    }
}
