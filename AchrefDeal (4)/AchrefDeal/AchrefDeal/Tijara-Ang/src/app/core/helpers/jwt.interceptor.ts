import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

    constructor(public router: Router) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Lire le token depuis localStorage (notre mécanisme d'auth)
        try {
            const raw = localStorage.getItem('currentUser');
            if (raw) {
                const user = JSON.parse(raw);
                if (user?.token) {
                    request = request.clone({
                        setHeaders: { Authorization: `Bearer ${user.token}` }
                    });
                }
            }
        } catch {
            localStorage.removeItem('currentUser');
        }

        return next.handle(request).pipe(
            catchError((error) => {
                // Ne pas rediriger si c'est une requête de login/register/google
                const isAuthUrl = request.url.includes('/auth/login')
                    || request.url.includes('/auth/register')
                    || request.url.includes('/auth/google');

                if (error.status === 401 && !isAuthUrl) {
                    // Token expiré ou invalide → déconnexion
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('token');
                    localStorage.removeItem('toast');
                    window.location.href = '/auth/login';
                }
                return throwError(() => error);
            })
        );
    }
}
