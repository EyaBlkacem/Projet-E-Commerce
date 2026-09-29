import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class VendorGuard {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const roleId = Number(user?.IdRole ?? user?.user?.IdRole);
      if (roleId === 2 || user?.role === 'vendor') return true;

      if (roleId === 3 || user?.role === 'admin') {
        this.router.navigate(['/admin']);
      } else if (user?.token) {
        this.router.navigate(['/users/dashboard']);
      } else {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
      }
    } catch {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
    return false;
  }
}
