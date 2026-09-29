import { Component, OnInit, AfterViewInit, NgZone } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { environment } from 'src/environments/environment';

declare const google: any;
declare const FB: any;

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
    standalone: false
})
export class RegisterComponent implements OnInit, AfterViewInit {

    signupForm!: UntypedFormGroup;
    submitted        = false;
    loading          = false;
    googleLoading    = false;
    facebookLoading  = false;
    error            = '';
    fieldTextType    = false;
    pendingApproval  = false;
    emailSent        = false;   // confirmation email sent
    registeredEmail  = '';
    year: number     = new Date().getFullYear();

    constructor(
        private fb: UntypedFormBuilder,
        private router: Router,
        private auth: AuthenticationService,
        private ngZone: NgZone,
    ) {}

    ngOnInit(): void {
        this.signupForm = this.fb.group({
            role:          ['user'],
            firstName:     ['', Validators.required],
            lastName:      ['', Validators.required],
            phone:         [''],
            city:          [''],
            shopName:      [''],
            companyNumber: [''],
            email:         ['', [Validators.required, Validators.email]],
            password:      ['', [Validators.required, Validators.minLength(6)]],
            birthDate:     [''],   // date de naissance (client uniquement)
            gender:        [''],   // genre (client uniquement)
        });
    }

    ngAfterViewInit(): void {
        this.initGoogleSignIn();
    }

    initGoogleSignIn(): void {
        try {
            google.accounts.id.initialize({
                client_id: environment.googleClientId,
                callback: (response: any) => {
                    this.ngZone.run(() => this.handleGoogleCredential(response.credential));
                }
            });
            google.accounts.id.renderButton(
                document.getElementById('google-btn-register'),
                { theme: 'outline', size: 'large', width: 340, text: 'signup_with', logo_alignment: 'left' }
            );
        } catch (e) {}
    }

    handleGoogleCredential(credential: string): void {
        this.googleLoading = true;
        this.error = '';
        this.auth.googleLogin(credential).subscribe({
            next: (res: any) => {
                this.googleLoading = false;
                const currentUser = {
                    token:     res.token,
                    id:        res.user.id,
                    email:     res.user.email,
                    role:      res.user.role,
                    firstName: res.user.first_name,
                    lastName:  res.user.last_name,
                    shopName:  res.user.shop_name || '',
                };
                localStorage.setItem('toast', 'true');
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                this.router.navigate(['/users/dashboard']);
            },
            error: (err: any) => {
                this.googleLoading = false;
                this.error = err?.error?.message || 'Connexion Google Ã©chouÃ©e.';
            }
        });
    }

    get f() { return this.signupForm.controls; }

    setRole(role: string): void {
        this.signupForm.patchValue({ role });
        // Ajouter/retirer validation boutique selon le rÃ´le
        if (role === 'vendor') {
            this.f['shopName'].setValidators(Validators.required);
        } else {
            this.f['shopName'].clearValidators();
        }
        this.f['shopName'].updateValueAndValidity();
    }

    toggleFieldTextType() { this.fieldTextType = !this.fieldTextType; }

    facebookLogin(): void {
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
                                const currentUser = {
                                    token:          res.token,
                                    id:             res.user.id,
                                    email:          res.user.email,
                                    role:           res.user.role || 'user',
                                    firstName:      res.user.first_name || '',
                                    lastName:       res.user.last_name  || '',
                                    shopName:       res.user.shop_name  || '',
                                    profilePicture: res.user.profile_picture || '',
                                };
                                localStorage.setItem('toast', 'true');
                                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                                this.router.navigate(['/users/dashboard']);
                            });
                        },
                        error: (err: any) => {
                            this.ngZone.run(() => {
                                this.facebookLoading = false;
                                this.error = err?.error?.message || 'Connexion Facebook Ã©chouÃ©e.';
                            });
                        }
                    });
                } else {
                    this.ngZone.run(() => { this.facebookLoading = false; });
                }
            }, { scope: 'public_profile,email' });
        } catch {
            this.facebookLoading = false;
            this.error = 'Facebook SDK non disponible.';
        }
    }

    onSubmit() {
        this.submitted = true;
        this.error = '';
        if (this.signupForm.invalid) return;

        this.loading = true;

        this.auth.register({
            Username:  `${this.f['firstName'].value.trim()} ${this.f['lastName'].value.trim()}`,
            FirstName: this.f['firstName'].value.trim(),
            LastName:  this.f['lastName'].value.trim(),
            Email:     this.f['email'].value.trim().toLowerCase(),
            Telephone: this.f['phone'].value?.trim() || '',
            Password:  this.f['password'].value,
            IdRole:    this.f['role'].value === 'vendor' ? 2 : 1,
        }).subscribe({
            next: (res: any) => {
                this.loading = false;
                // Le backend renvoie toujours { user, token } sur un register rÃ©ussi.
                // (Si tu ajoutes plus tard un flux "pending_approval" ou "email_sent"
                //  cÃ´tÃ© Laravel, remets les branches correspondantes ici.)
                if (res.token) {
                    const currentUser = {
                        token:     res.token,
                        id:        res.user?.IdUser ?? res.user?.id,
                        IdRole:    res.user?.IdRole,
                        email:     res.user?.Email,
                        role:      res.user?.IdRole === 2 ? 'vendor' : 'user',
                        firstName: res.user?.FirstName || '',
                        lastName:  res.user?.LastName  || '',
                        shopName:  res.user?.shop_name || '',
                    };
                    localStorage.setItem('toast',       'true');
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    this.router.navigate([currentUser.role === 'vendor' ? '/ent/dashboard' : '/users/dashboard']);
                } else {
                    this.router.navigate(['/auth/login']);
                }
            },
            error: (err: any) => {
                this.loading = false;
                this.error = err?.error?.message || 'Erreur lors de l\'inscription. VÃ©rifiez vos donnÃ©es.';
            }
        });
    }
}

