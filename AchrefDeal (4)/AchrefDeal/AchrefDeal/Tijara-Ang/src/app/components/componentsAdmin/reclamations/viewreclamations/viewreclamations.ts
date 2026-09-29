import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { ReclamationsService } from 'src/app/core/services/reclamations.service';
import { UsersVendorsService } from 'src/app/core/services/users-vendors.service';

@Component({
  selector: 'app-viewreclamations',
  standalone: false,
  templateUrl: './viewreclamations.html',
  styleUrl: './viewreclamations.scss',
})
export class Viewreclamations implements OnInit {

  breadCrumbItems = [
    { label: 'Admin' },
    { label: 'Réclamations', active: true }
  ];

  statuses = ['En attente', 'En cours', 'Résolue', 'Fermée'];
  filterStatut = 'tous';
  searchTerm = '';
  loading = true;

  reclamations: any[] = [];
  filteredReclamations: any[] = [];
  selectedRec: any | null = null;

  totalItems = 0;
  private usersMap: Record<number, { name: string; email: string; role: string }> = {};

  constructor(private reclamationsApi: ReclamationsService, private usersVendors: UsersVendorsService) {}

  ngOnInit(): void {
    this.usersVendors.getAdminAllUsers({ per_page: 200 }).subscribe({
      next: (res: any) => {
        (res?.data || []).forEach((u: any) => {
          this.usersMap[u.IdUser] = {
            name: `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Username || 'Utilisateur',
            email: u.Email || '',
            role: u.IdRole === 2 ? 'vendor' : 'user',
          };
        });
        this.loadReclamations();
      },
      error: () => this.loadReclamations(),
    });
  }

  loadReclamations(): void {
    this.loading = true;
    this.reclamationsApi.getReclamations({ per_page: 200 }).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data || [];
        this.totalItems = res?.total ?? rows.length;
        this.reclamations = rows.map(r => {
          const u = this.usersMap[r.IdUser];
          return {
            id:      r.IdReclamation,
            user:    u?.name  || `Utilisateur #${r.IdUser}`,
            email:   u?.email || '',
            role:    u?.role === 'vendor' ? 'Vendeur' : 'Client',
            sujet:   r.Subject     ?? '—',
            message: r.Description ?? '',
            date:    r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString('fr-FR') : '—',
            statut:  this.mapStatus(r.Status),
            adminReply: r.AdminReply || '',
            apiId:   r.IdReclamation,
          };
        });
        this.loading = false;
        this.applyFilter();
      },
      error: () => { this.loading = false; }
    });
  }

  // ✅ Enum réel côté backend (Reclamationscontroller::reply/updateStatus) :
  // 'open' | 'in_progress' | 'resolved' | 'closed'. Il n'y a PAS de statut
  // "rejected" — remplacé par "closed" ("Fermée").
  private mapStatus(s: string): string {
    switch (s) {
      case 'open':        return 'En attente';
      case 'in_progress': return 'En cours';
      case 'resolved':    return 'Résolue';
      case 'closed':      return 'Fermée';
      default:            return 'En attente';
    }
  }

  private statusToApi(s: string): string {
    switch (s) {
      case 'En attente': return 'open';
      case 'En cours':   return 'in_progress';
      case 'Résolue':    return 'resolved';
      case 'Fermée':     return 'closed';
      default:           return 'open';
    }
  }

  applyFilter(): void {
    this.filteredReclamations = this.reclamations.filter(r => {
      const matchStatut = this.filterStatut === 'tous' || r.statut === this.filterStatut;
      const matchSearch = !this.searchTerm ||
        r.user.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        r.sujet.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        String(r.id).includes(this.searchTerm);
      return matchStatut && matchSearch;
    });
  }

  // ✅ PATCH /reclamations/{id}/status — route réelle de l'encadrant.
  changeStatut(rec: any, statut: string): void {
    const previous = rec.statut;
    rec.statut = statut;
    this.reclamationsApi.updateReclamationStatus(rec.apiId, this.statusToApi(statut)).subscribe({
      next: () => this.applyFilter(),
      error: () => {
        rec.statut = previous;
        this.applyFilter();
        alert('Changement de statut impossible. Réessayez.');
      },
    });
  }

  showDetail(rec: any): void { this.selectedRec = rec; this.replyDraft = ''; }
  closeDetail(): void        { this.selectedRec = null; this.replyDraft = ''; }

  replyDraft = '';

  // ✅ PATCH /reclamations/{id}/reply — passe automatiquement le statut à
  // "resolved" côté backend si on n'en précise pas un autre nous-mêmes.
  sendReply(rec: any): void {
    const text = this.replyDraft.trim();
    if (!text) return;
    this.reclamationsApi.replyToReclamation(rec.apiId, text).subscribe({
      next: (res: any) => {
        rec.adminReply = text;
        rec.statut = this.mapStatus(res?.Status || 'resolved');
        this.replyDraft = '';
        this.applyFilter();
      },
      error: () => alert('Envoi de la réponse impossible. Réessayez.'),
    });
  }

  // ⚠️ Suppression retirée : le contrôleur réel de l'encadrant
  // (Reclamationscontroller.php) n'a pas de méthode destroy() ni de route
  // DELETE /reclamations/{id}. Un ticket ne peut être que fermé (statut
  // "closed"), jamais supprimé. Si la suppression est réellement voulue,
  // il faut la demander à l'encadrant.

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'En attente': return 'bg-warning-subtle text-warning';
      case 'En cours':   return 'bg-info-subtle text-info';
      case 'Résolue':    return 'bg-success-subtle text-success';
      case 'Fermée':     return 'bg-secondary-subtle text-secondary';
      default:           return 'bg-secondary-subtle text-secondary';
    }
  }

  getRoleClass(role: string): string {
    return role === 'Vendeur' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary';
  }

  get countByStatut() {
    return {
      attente: this.reclamations.filter(r => r.statut === 'En attente').length,
      cours:   this.reclamations.filter(r => r.statut === 'En cours').length,
      resolue: this.reclamations.filter(r => r.statut === 'Résolue').length,
      rejetee: this.reclamations.filter(r => r.statut === 'Fermée').length,
    };
  }
}