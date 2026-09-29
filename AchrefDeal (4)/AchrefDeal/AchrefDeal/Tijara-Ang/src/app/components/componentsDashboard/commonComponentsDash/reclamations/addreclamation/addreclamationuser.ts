import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';

@Component({
  selector: 'app-addreclamation-user',
  standalone: false,
  templateUrl: './addreclamationuser.html',
  styleUrl: './addreclamationuser.scss',
})
export class AddReclamationUser implements OnInit {

  reclamationForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  alertMessage = '';
  successMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private api: TijaraApiService
  ) {}

  ngOnInit(): void {
    this.reclamationForm = this.formBuilder.group({
      Subject: ['', [Validators.required, Validators.minLength(3)]],
      Description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  get f() {
    return this.reclamationForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.alertMessage = '';
    this.successMessage = '';

    if (this.reclamationForm.invalid) {
      return;
    }

    if (!this.api.getCurrentUserId()) {
      this.alertMessage = 'Vous devez être connecté pour envoyer une réclamation.';
      return;
    }

    const payload = {
      Subject: this.reclamationForm.value.Subject,
      Description: this.reclamationForm.value.Description,
    };
    this.loading = true;
    this.api.createReclamation(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Réclamation envoyée avec succès.';
        this.reclamationForm.reset();
        this.submitted = false;
        setTimeout(() => {
          this.router.navigate(['../'], { relativeTo: this.route });
        }, 1200);
      },
      error: () => {
        this.loading = false;
        this.alertMessage = "Une erreur est survenue lors de l'envoi de la réclamation.";
      }
    });
  }

  resetForm(): void {
    this.reclamationForm.reset();
    this.submitted = false;
    this.alertMessage = '';
    this.successMessage = '';
  }
  cancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
