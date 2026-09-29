import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-contact',
    templateUrl: './contact.component.html',
    standalone: false
})
export class ContactComponent {
    form: FormGroup;
    submitted = false;
    sent      = false;
    sending   = false;

    infos = [
        { icon: 'ri-map-pin-2-line',       label: 'Adresse',   value: 'Centre Urbain Nord, Tunis, Tunisie', color: '#405189' },
        { icon: 'ri-mail-send-line',        label: 'Email',     value: 'support@tijara.tn',                  color: '#0ab39c' },
        { icon: 'ri-phone-line',            label: 'Téléphone', value: '+216 70 000 000',                    color: '#f7b84b' },
        { icon: 'ri-time-line',             label: 'Horaires',  value: 'Lun–Ven  9h–18h',                   color: '#f06548' },
    ];

    subjects = ['Question générale', 'Problème technique', 'Signalement', 'Partenariat', 'Presse', 'Autre'];

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            name:    ['', [Validators.required, Validators.minLength(2)]],
            email:   ['', [Validators.required, Validators.email]],
            subject: ['', Validators.required],
            message: ['', [Validators.required, Validators.minLength(20)]],
        });
    }

    get f() { return this.form.controls; }

    submit(): void {
        this.submitted = true;
        if (this.form.invalid) return;
        this.sending = true;
        // Simulate send
        setTimeout(() => { this.sending = false; this.sent = true; this.form.reset(); this.submitted = false; }, 1200);
    }
}
