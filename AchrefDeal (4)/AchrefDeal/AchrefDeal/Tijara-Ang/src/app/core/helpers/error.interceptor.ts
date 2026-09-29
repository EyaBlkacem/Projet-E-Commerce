import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TokenStorageService } from '../services/token-storage.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(private tokenStorageService: TokenStorageService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            const isLoginUrl = request.url.includes('/auth/login') || request.url.includes('/auth/register');
            if (err.status === 401 && !isLoginUrl) {
                // auto logout if 401 response returned from api (not during login)
                this.tokenStorageService.signOut();
                location.reload();
            }
            const error = (err.error && err.error.message) ? err.error.message : (err.statusText || 'Erreur inconnue');
            return throwError(() => err);
        }))
    }
}
