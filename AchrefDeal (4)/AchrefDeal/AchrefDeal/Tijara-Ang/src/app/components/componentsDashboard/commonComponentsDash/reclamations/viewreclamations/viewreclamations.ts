import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';

@Component({ selector: 'app-viewreclamations', standalone: false, templateUrl: './viewreclamations.html', styleUrl: './viewreclamations.scss' })
export class Viewreclamations implements OnInit {
  breadCrumbItems = [{ label: 'Mon espace' }, { label: 'Réclamations', active: true }];
  statuses = ['En attente', 'En cours', 'Résolue', 'Fermée'];
  filterStatut = 'tous'; searchTerm = ''; loading = true; loadError = ''; statusUpdateError = '';
  reclamations: any[] = []; filteredReclamations: any[] = []; selectedRec: any | null = null;
  showAddModal = false; addForm!: UntypedFormGroup; addSubmitted = false; addLoading = false; addError = ''; addSuccess = '';

  constructor(private api: TijaraApiService, private fb: UntypedFormBuilder) {}
  ngOnInit(): void {
    this.addForm = this.fb.group({ Subject: ['', [Validators.required, Validators.minLength(3)]], Description: ['', [Validators.required, Validators.minLength(10)]] });
    this.loadReclamations();
  }
  get fAdd() { return this.addForm.controls; }
  openAddModal(): void { this.showAddModal = true; this.addSubmitted = false; this.addError = ''; this.addSuccess = ''; this.addForm.reset(); }
  closeAddModal(): void { this.showAddModal = false; }
  submitAddReclamation(): void {
    this.addSubmitted = true; this.addError = '';
    if (this.addForm.invalid) return;
    if (!this.api.getCurrentUserId()) { this.addError = 'Vous devez être connecté pour envoyer une réclamation.'; return; }
    this.addLoading = true;
    this.api.createReclamation(this.addForm.value).subscribe({
      next: () => { this.addLoading = false; this.addSuccess = 'Réclamation envoyée avec succès.'; this.addForm.reset(); this.addSubmitted = false; setTimeout(() => { this.showAddModal = false; this.loadReclamations(); }, 800); },
      error: (err: any) => { this.addLoading = false; this.addError = err?.error?.message ?? "Une erreur est survenue lors de l'envoi de la réclamation."; },
    });
  }
  loadReclamations(): void {
    this.loading = true; this.loadError = '';
    this.api.getMyReclamations({ per_page: 50 }).subscribe({
      next: (data: any[]) => {
        const user = this.currentUser(); const name = [user?.FirstName, user?.LastName].filter(Boolean).join(' ') || user?.Username || 'Vous';
        this.reclamations = (data ?? []).map((r: any) => ({ id: `REC-${r.IdReclamation ?? r.id}`, apiId: r.IdReclamation ?? r.id, user: name, email: user?.Email ?? '', role: Number(user?.IdRole) === 2 ? 'Vendeur' : 'Client', sujet: r.Subject ?? '', message: r.Description ?? '', date: r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString('fr-FR') : '', statut: this.statusFromApi(r.Status), adminReply: r.AdminReply ?? '' }));
        this.loading = false; this.applyFilter();
      },
      error: () => { this.loading = false; this.loadError = 'Impossible de charger vos réclamations pour le moment.'; },
    });
  }
  applyFilter(): void {
    const search = this.searchTerm.toLowerCase();
    this.filteredReclamations = this.reclamations.filter(r => (this.filterStatut === 'tous' || r.statut === this.filterStatut) && (!search || r.sujet.toLowerCase().includes(search) || String(r.id).includes(search)));
  }
  showDetail(rec: any): void { this.selectedRec = rec; }
  closeDetail(): void { this.selectedRec = null; }
  getStatusClass(statut: string): string { return ({ 'En attente': 'bg-warning-subtle text-warning', 'En cours': 'bg-info-subtle text-info', 'Résolue': 'bg-success-subtle text-success', 'Fermée': 'bg-secondary-subtle text-secondary' } as Record<string, string>)[statut] ?? 'bg-secondary-subtle text-secondary'; }
  getRoleClass(role: string): string { return role === 'Vendeur' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'; }
  get countByStatut() { return { attente: this.reclamations.filter(r => r.statut === 'En attente').length, cours: this.reclamations.filter(r => r.statut === 'En cours').length, resolue: this.reclamations.filter(r => r.statut === 'Résolue').length, rejetee: this.reclamations.filter(r => r.statut === 'Fermée').length }; }
  private statusFromApi(status: string): string { return ({ open: 'En attente', in_progress: 'En cours', resolved: 'Résolue', closed: 'Fermée' } as Record<string, string>)[status] ?? 'En attente'; }
  private currentUser(): any { try { const session = JSON.parse(localStorage.getItem('currentUser') || '{}'); return session?.user ?? session; } catch { return {}; } }
}
