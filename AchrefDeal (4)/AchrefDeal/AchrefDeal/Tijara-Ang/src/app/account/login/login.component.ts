import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { environment } from 'src/environments/environment';

declare const google: any;
declare const FB: any;

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    standalone: false
})
export class LoginComponent implements OnInit, AfterViewInit {

    loginForm!: UntypedFormGroup;
    submitted       = false;
    loading         = false;
    error           = '';
    success         = '';
    fieldTextType   = false;
    year            = new Date().getFullYear();

    demoUsers = [
        { email: 'admin@tijara.tn',  password: 'admin123',  role: 'admin'  },
        { email: 'vendor@tijara.tn', password: 'vendor123', role: 'vendor' },
        { email: 'user@tijara.tn',   password: 'user123',   role: 'user'   },
    ];

    googleLoading    = false;
    facebookLoading  = false;
    googleConfigured = false;  // true uniquement si clientId réel configuré

    // ✅ CORRIGÉ — voir buildCurrentUser() : mappe l'entier IdRole (1/2/3)
    // renvoyé par le backend vers une chaîne de rôle exploitable par
    // redirectByRole(). Avant ce correctif, res.user.role n'existait pas
    // dans la réponse Laravel (colonnes en PascalCase, IdRole entier), donc
    // TOUT compte (vendeur ou admin inclus) était redirigé vers
    // /users/dashboard comme un simple client.
    private static readonly ROLE_MAP: Record<number, 'user' | 'vendor' | 'admin'> = {
        1: 'user',
        2: 'vendor',
        3: 'admin',
    };

    constructor(
        private fb: UntypedFormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private auth: AuthenticationService,
        private ngZone: NgZone,
    ) {
        try {
            const raw = localStorage.getItem('currentUser');
            if (raw) {
                const user = JSON.parse(raw);
                if (user?.role) this.redirectByRole(user.role);
            }
        } catch {
            localStorage.removeItem('currentUser');
        }
    }

    ngOnInit(): void {
        this.loginForm = this.fb.group({
            email:    ['', [Validators.required, Validators.email]],
            password: ['', Validators.required],
        });
        this.route.queryParams.subscribe(p => {
            if (p['confirmed'] === '1')
                this.success = '✅ Email confirmé avec succès ! Vous pouvez maintenant vous connecter.';
        });
    }

    ngAfterViewInit(): void {
        this.initGoogleSignIn();
    }

    // ── Google Sign-In ──────────────────────────────────────────────

    initGoogleSignIn(): void {
        const clientId = environment.googleClientId || '';
        // Ne pas initialiser GIS si l'ID est un placeholder
        if (!clientId || clientId.includes('YOUR_GOOGLE') || clientId === '') {
            this.googleConfigured = false;
            return;
        }
        try {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: (response: any) => {
                    this.ngZone.run(() => this.handleGoogleCredential(response.credential));
                }
            });
            google.accounts.id.renderButton(
                document.getElementById('google-btn-login'),
                { theme: 'outline', size: 'large', width: 340, text: 'signin_with', logo_alignment: 'left' }
            );
            this.googleConfigured = true;
        } catch (e) {
            this.googleConfigured = false;
        }
    }

    handleGoogleCredential(credential: string): void {
        this.googleLoading = true;
        this.error = '';
        this.auth.googleLogin(credential).subscribe({
            next: (res: any) => {
                this.googleLoading = false;
                const currentUser = this.buildCurrentUser(res);
                localStorage.setItem('toast', 'true');
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                this.markFirstLoginIfNeeded(currentUser.id);
                this.redirectByRole(currentUser.role);
            },
            error: (err: any) => {
                this.googleLoading = false;
                this.error = err?.error?.message || 'Connexion Google échouée.';
            }
        });
    }

    /** Demo : connexion Google simulée (sans vrai OAuth) */
    loginDemoGoogle(): void {
        this.googleLoading = true;
        setTimeout(() => {
            this.googleLoading = false;
            const currentUser = {
                token:          'demo_google_token',
                id:             9001,
                email:          'demo.google@tijara.tn',
                role:           'user',
                firstName:      'Demo Google',
                lastName:       '',
                shopName:       '',
                phone:          '',
                city:           '',
                address:        '',
                country:        'Tunisie',
                profilePicture: '',
                isApproved:     true,
            };
            localStorage.setItem('toast', 'true');
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            this.markFirstLoginIfNeeded(currentUser.id);
            this.redirectByRole('user');
        }, 800);
    }

    // ── Facebook Login ──────────────────────────────────────────────

    facebookLogin(): void {
        // Vérifier si l'App ID Facebook est valide (pas '0' ou vide)
        const fbAppId = environment.facebookAppId || '0';
        if (!fbAppId || fbAppId === '0' || fbAppId === '') {
            this.loginDemoFacebook();
            return;
        }

        this.facebookLoading = true;
        this.error = '';
        try {
            FB.login((loginResp: any) => {
                if (loginResp.authResponse?.accessToken) {
                    const token = loginResp.authResponse.accessToken;
                    this.auth.facebookLogin(token).subscribe({
                        next: (res: any) => {
                            this.ngZone.run(() => {
                                this.facebookLoading = false;
                                const currentUser = this.buildCurrentUser(res);
                                localStorage.setItem('toast', 'true');
                                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                                this.markFirstLoginIfNeeded(currentUser.id);
                                this.redirectByRole(currentUser.role);
                            });
                        },
                        error: (err: any) => {
                            this.ngZone.run(() => {
                                this.facebookLoading = false;
                                this.error = err?.error?.message || 'Connexion Facebook échouée.';
                            });
                        }
                    });
                } else {
                    this.ngZone.run(() => {
                        this.facebookLoading = false;
                        if (loginResp.status !== 'unknown') {
                            this.error = 'Connexion Facebook annulée.';
                        }
                    });
                }
            }, { scope: 'public_profile,email' });
        } catch {
            this.facebookLoading = false;
            this.loginDemoFacebook();
        }
    }

    /** Demo : connexion Facebook simulée (sans vrai App ID) */
    private loginDemoFacebook(): void {
        this.facebookLoading = true;
        setTimeout(() => {
            this.facebookLoading = false;
            const currentUser = {
                token:          'demo_facebook_token',
                id:             9002,
                email:          'demo.facebook@tijara.tn',
                role:           'user',
                firstName:      'Demo Facebook',
                lastName:       '',
                shopName:       '',
                phone:          '',
                city:           '',
                address:        '',
                country:        'Tunisie',
                profilePicture: '',
                isApproved:     true,
            };
            localStorage.setItem('toast', 'true');
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            this.markFirstLoginIfNeeded(currentUser.id);
            this.redirectByRole('user');
        }, 800);
    }

    private getFBAppId(): string {
        try {
            // Lire l'App ID depuis le script FB déjà initialisé
            const match = document.cookie.match(/fblo_(\d+)/);
            if (match) return match[1];
            // Fallback : lire depuis le SDK
            return (window as any).FB?.AppID?.toString() || '0';
        } catch {
            return '0';
        }
    }

    // ── Formulaire e-mail ───────────────────────────────────────────

    get f() { return this.loginForm.controls; }

    toggleFieldTextType(): void { this.fieldTextType = !this.fieldTextType; }

    fillDemo(user: any): void {
        this.loginForm.patchValue({ email: user.email, password: user.password });
    }

    onSubmit(): void {
        this.submitted = true;
        this.error     = '';
        if (this.loginForm.invalid) return;

        this.loading = true;
        const email    = this.f['email'].value.trim().toLowerCase();
        const password = this.f['password'].value;

        this.auth.login(email, password).subscribe({
            next: (res: any) => {
                this.loading = false;
                const currentUser = this.buildCurrentUser(res);
                localStorage.setItem('toast', 'true');
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                this.markFirstLoginIfNeeded(currentUser.id);
                this.redirectByRole(currentUser.role);
            },
            error: (err: any) => {
                this.loading = false;
                if (err?.error?.status === 'pending_approval') {
                    this.error = '⏳ Votre compte vendeur est en attente de validation par l\'administrateur.';
                } else {
                    this.error = err?.error?.message || 'Email ou mot de passe incorrect.';
                }
            }
        });
    }

    // ── Ajout : détection "première connexion" pour la box FirstLogin ──
    // Pas de flag "première connexion" côté backend (colonne inexistante
    // dans Users). On simule donc côté front, par identifiant de compte,
    // via localStorage (persistant) : la première fois qu'un IdUser donné
    // se connecte sur ce navigateur, on pose un flag de session que
    // IndexComponent lira une seule fois pour ouvrir la box, puis le
    // consomme (sessionStorage.removeItem) pour ne plus jamais la
    // ré-ouvrir sur ce compte, même après un rafraîchissement de page.
    // ⚠️ Limite connue : reset si l'utilisateur vide son cache ou change
    // de navigateur/appareil. Pour une vraie robustesse en prod, il
    // faudrait une colonne IsFirstLogin gérée côté backend.
    private markFirstLoginIfNeeded(userId: any): void {
        if (userId === undefined || userId === null) return;
        const seenKey = `hasLoggedInBefore_${userId}`;
        if (!localStorage.getItem(seenKey)) {
            localStorage.setItem(seenKey, 'true');
            sessionStorage.setItem('showFirstLoginBox', 'true');
        }
    }

    // ✅ CORRIGÉ — voir le commentaire sur ROLE_MAP en haut du fichier.
    // AuthController@login (Laravel) renvoie le modèle Users BRUT :
    // colonnes en PascalCase (IdUser, Email, FirstName, LastName,
    // Telephone, IdRole...), et IdRole est un ENTIER (1=user, 2=vendor,
    // 3=admin) — jamais une chaîne 'admin'/'vendor'/'user'. L'ancien code
    // lisait res.user.role / res.user.id / res.user.email / res.user.first_name
    // (snake_case minuscule), qui n'existent pas dans cette réponse :
    // - res.user.role valait donc toujours undefined
    // - redirectByRole(undefined) tombait systématiquement dans le "else"
    //   -> TOUT compte (vendeur ou admin inclus) atterrissait sur
    //      /users/dashboard, comme un simple client.
    // On mappe maintenant IdRole -> une chaîne de rôle exploitable, et on
    // lit les vrais noms de champs PascalCase renvoyés par le backend
    // (avec un fallback sur l'ancien nom au cas où un futur backend change
    // de convention).
    private buildCurrentUser(res: any) {
        const u = res.user || {};
        const idRole = Number(u.IdRole);
        return {
            token:          res.token,
            id:             u.IdUser ?? u.id,
            IdRole:         idRole,
            email:          u.Email ?? u.email,
            role:           LoginComponent.ROLE_MAP[idRole] ?? 'user',
            firstName:      u.FirstName      || '',
            lastName:       u.LastName       || '',
            shopName:       u.ShopName       || u.Username || '',
            phone:          u.Telephone      || u.phone || '',
            city:           u.City           || '',
            address:        u.Address        || '',
            country:        u.Country        || 'Tunisie',
            profilePicture: u.ProfilePicture || '',
            isApproved:     u.IsApproved ?? u.Active ?? true,
        };
    }

    private redirectByRole(role: string): void {
        if (role === 'admin')       this.router.navigate(['/admin/reclamations']);
        else if (role === 'vendor') this.router.navigate(['/ent/dashboard']);
        else                        this.router.navigate(['/users/dashboard']);
    }
}