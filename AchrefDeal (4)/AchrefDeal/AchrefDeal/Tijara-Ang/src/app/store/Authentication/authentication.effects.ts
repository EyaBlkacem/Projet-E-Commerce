import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, catchError, exhaustMap, tap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { AuthenticationService } from '../../core/services/auth.service';
import { login, loginSuccess, loginFailure, logout, logoutSuccess, Register} from './authentication.actions';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable()
export class AuthenticationEffects {
Register$ = createEffect(() =>
  this.actions$.pipe(
    ofType(Register),
    exhaustMap(({ email, first_name, password }) =>
      // ⚠️ Effet probablement mort : le flux d'inscription réel
      // (register.component.ts) appelle AuthenticationService.register()
      // directement en HTTP, avec Username/LastName/IdRole fournis par le
      // formulaire — il ne dispatch jamais l'action `Register` ci-dessous.
      // L'action ne transporte que { email, first_name, password }, donc
      // LastName/Username/IdRole sont ici des valeurs de repli purement
      // pour satisfaire le typage du service, PAS des valeurs métier
      // fiables. Si aucun autre écran ne dispatch `Register`, ce bloc
      // (action + effet) peut être supprimé.
      this.authService.register({
        Username:  first_name,
        FirstName: first_name,
        LastName:  '',
        Email:     email,
        Password:  password,
        IdRole:    1,
      }).pipe(
        map((user: any) => {
          this.router.navigate(['/auth/login']);
          return loginSuccess({ user });
        }),
        catchError((error) => of(loginFailure({ error })))
      )
    )
  )
);

  login$ = createEffect(() =>
  this.actions$.pipe(
    ofType(login),
    exhaustMap(({ email, password }) => {
      if (environment.defaultauth === "fakebackend") {
        return this.authService.login(email, password).pipe(
          map((user: any) => {
            if (user.status === 'success') {
              localStorage.setItem('toast', 'true');
              localStorage.setItem('currentUser', JSON.stringify(user.data));
              localStorage.setItem('token', user.token);
              // Redirection selon le rÃ´le
              const role = user.data?.role;
              if (role === 'admin') {
                this.router.navigate(['/admin/reclamations']);
              } else if (role === 'vendor') {
                this.router.navigate(['/ent/reclamations']);
              } else {
                this.router.navigate(['/users/reclamations']);
              }
            }
            return loginSuccess({ user });
          }),
          catchError((error) => of(loginFailure({ error })))
        );
      } else if (environment.defaultauth === "firebase") {
        return of();
      } else {
        return of();
      }
    })
  )
);

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logout),
      tap(() => {
        // Perform any necessary cleanup or side effects before logging out
      }),
      exhaustMap(() => of(logoutSuccess()))
    )
  );

  constructor(
    @Inject(Actions) private actions$: Actions,
    private authService: AuthenticationService,
    private router: Router) { }

}
