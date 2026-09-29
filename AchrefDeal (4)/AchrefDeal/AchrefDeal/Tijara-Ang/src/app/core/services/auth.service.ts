import { Injectable } from '@angular/core';
import { getFirebaseBackend } from '../../authUtils';
import { User } from 'src/app/store/Authentication/auth.models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { GlobalComponent } from "../../global-component";
import { Store } from '@ngrx/store';
import { loginFailure } from 'src/app/store/Authentication/authentication.actions';
import { BaseApiService } from './base-api.service';

const AUTH_API = GlobalComponent.AUTH_API;

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({ providedIn: 'root' })
export class AuthenticationService extends BaseApiService {

    user!: User;
    currentUserValue: any;
    private currentUserSubject: BehaviorSubject<User>;

    constructor(http: HttpClient, private store: Store) {
        super(http); // getHeaders(), getCurrentUserId(), apiUrl, etc. viennent de BaseApiService

        let storedUser: User | null = null;
        try {
            const raw = localStorage.getItem('currentUser');
            storedUser = raw ? JSON.parse(raw) : null;
        } catch { storedUser = null; }
        this.currentUserSubject = new BehaviorSubject<User>(storedUser as User);
    }

    // ---------- Auth ----------

    register(data: {
        Username: string;
        FirstName: string;
        LastName: string;
        Email: string;
        Telephone?: string;
        Password: string;
        IdRole: number;
    }) {
        return this.http.post(AUTH_API + 'signup', data, httpOptions).pipe(
            map((response: any) => response),
            catchError((error: any) => {
                this.store.dispatch(loginFailure({ error: 'Register failed' }));
                return throwError(() => error);
            })
        );
    }
login(email: string, password: string) {
    return this.http.post(AUTH_API + 'login', { Email: email, Password: password }, httpOptions).pipe(
        map((response: any) => response),
        catchError((error: any) => throwError(() => error))
    );
}

    /** ⚠️ Route non confirmée backend — aucun Google Sign-In vu dans AuthController */
    googleLogin(credential: string) {
        return this.http.post(AUTH_API + 'google', { credential }, httpOptions).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError(() => error))
        );
    }

    /** ⚠️ Incompatible avec le backend actuel (Socialite en mode redirect, pas token) — voir discussion précédente */
    facebookLogin(accessToken: string) {
        return this.http.post(AUTH_API + 'facebook', { access_token: accessToken }, httpOptions).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError(() => error))
        );
    }

    /** ⚠️ Aucune route backend trouvée pour confirmer l'email */
    confirmEmail(token: string) {
        return this.http.get(AUTH_API + 'confirm-email/' + token, httpOptions).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError(() => error))
        );
    }

    public currentUser(): any {
        return getFirebaseBackend()!.getAuthenticatedUser();
    }

    logout() {
        try {
            const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (u?.id) localStorage.removeItem(`tijara_cart_${u.id}`);
        } catch {}
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        localStorage.removeItem('toast');
        localStorage.removeItem('tijara_cart');
        sessionStorage.clear();
        this.currentUserSubject.next(null!);
        return of(undefined);
    }

    /** ⚠️ Toujours branché sur Firebase — obsolète, à remplacer par POST /forgot-password (Email) le jour où on migre resetPassword côté composant appelant */
    resetPassword(email: string) {
        return getFirebaseBackend()!.forgetPassword(email).then((response: any) => response.data);
    }

    // ---------- Profil (self-service) ----------

    /** GET /me — confirmé dans AuthController */
    getMe() {
        return this.http.get(this.apiUrl.replace(/\/api\/?$/, '/api') + '/me', { headers: this.getHeaders() }).pipe(
            catchError((error: any) => throwError(() => error))
        );
    }

    /**
     * PUT /api/profile — confirmé dans UsersController::updateProfile().
     * Traduit le payload snake_case du composant vers le PascalCase attendu.
     * ⚠️ profile_picture n'est PAS envoyée ici : le backend attend un vrai
     * fichier multipart (ProfilePicture), pas la chaîne base64 générée par
     * le composant. À corriger côté profile-user.component.ts (garder le
     * File et l'envoyer via FormData) avant que l'upload photo fonctionne.
     */
/**
 * PUT /api/profile — UsersController::updateProfile().
 * Si `photo` est fourni, on envoie en multipart/form-data avec spoofing
 * `_method=PUT` (obligatoire : PHP ne parse pas les fichiers sur une
 * requête PUT native, Laravel a besoin d'un POST + champ _method pour
 * router correctement vers la méthode PUT et remplir $request->file()).
 * Sans photo, on reste en JSON classique.
 */
updateProfile(data: {
    first_name?: string;
    last_name?: string;
    username?: string | null;
    phone?: string;
    city?: string;
    address?: string;
    birth_date?: string | null;
    gender?: string | null;
}, photo?: File | null) {

    if (photo) {
        const form = new FormData();
        form.append('_method', 'PUT');
        if (data.first_name != null) form.append('FirstName', data.first_name);
        if (data.last_name  != null) form.append('LastName', data.last_name);
        if (data.username   != null) form.append('Username', data.username);
        if (data.phone      != null) form.append('Telephone', data.phone);
        if (data.city       != null) form.append('City', data.city);
        if (data.address    != null) form.append('Location', data.address);
        if (data.birth_date != null) form.append('BirthDate', data.birth_date);
        if (data.gender     != null) form.append('Gender', data.gender);
        form.append('ProfilePicture', photo, photo.name);

        return this.http.post(this.apiUrl + '/profile', form, { headers: this.getAuthHeadersOnly() }).pipe(
            map((res: any) => ({ user: res?.data ?? res })),
            catchError((error: any) => throwError(() => error))
        );
    }

    const payload: any = {};
    if (data.first_name != null) payload.FirstName = data.first_name;
    if (data.last_name  != null) payload.LastName  = data.last_name;
    if (data.username   != null) payload.Username  = data.username;
    if (data.phone      != null) payload.Telephone = data.phone;
    if (data.city       != null) payload.City      = data.city;
    if (data.address    != null) payload.Location  = data.address;
    if (data.birth_date != null) payload.BirthDate = data.birth_date;
    if (data.gender     != null) payload.Gender    = data.gender;

    return this.http.put(this.apiUrl + '/profile', payload, { headers: this.getHeaders() }).pipe(
        map((res: any) => ({ user: res?.data ?? res })),
        catchError((error: any) => throwError(() => error))
    );
}

    /**
     * ⚠️ ATTENTION SÉCURITÉ : réutilise PUT /profile avec un champ Password,
     * mais UsersController::updateProfile() ne vérifie PAS le mot de passe
     * actuel avant d'écraser l'ancien. Le message "mot de passe actuel
     * incorrect" du composant ne se déclenchera jamais tant que le backend
     * ne valide pas current_password. Ne pas mettre en prod sans corriger
     * UsersController::updateProfile() pour exiger et vérifier Password
     * actuel (Hash::check) avant d'accepter le nouveau.
     */
    changePassword(data: { current_password: string; new_password: string }) {
        return this.http.put(this.apiUrl + '/profile',
            { Password: data.new_password, CurrentPassword: data.current_password },
            { headers: this.getHeaders() }
        ).pipe(
            catchError((error: any) => throwError(() => error))
        );
    }

    
 getVerificationStatus() {
    return this.http.get(this.apiUrl.replace(/\/api\/?$/, '/api') + '/verification/status', { headers: this.getHeaders() }).pipe(
        catchError((error: any) => throwError(() => error))
    );
}

submitVerification(documentType: 'cin' | 'patente', identityNumber: string, photo: File) {
    const form = new FormData();
    form.append('identity_type', documentType);
    form.append('identity_number', identityNumber);
    form.append('identity_photo', photo, photo.name);

    return this.http.post(this.apiUrl.replace(/\/api\/?$/, '/api') + '/verification/submit', form, { headers: this.getAuthHeadersOnly() }).pipe(
        catchError((error: any) => throwError(() => error))
    );
}
}