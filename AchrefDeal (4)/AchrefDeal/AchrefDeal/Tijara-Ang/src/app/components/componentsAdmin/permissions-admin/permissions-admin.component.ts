import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { PermissionsService } from 'src/app/core/services/permissions.service';

type Perm = { idPermission?: number; idRole: number; resource: string;
              canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean };

@Component({
  selector: 'app-permissions-admin',
  standalone: false,
  template: `
<app-breadcrumbs title="Permissions" [breadcrumbItems]="breadcrumbItems"></app-breadcrumbs>

<div class="row g-3 mb-4">
  @for (r of roles; track r.id) {
    <div class="col-md-4">
      <div class="card border-0 shadow-sm h-100" [style.borderLeft]="'4px solid ' + r.color">
        <div class="card-body d-flex align-items-center gap-3 py-3">
          <div class="avatar-md rounded-3 d-flex align-items-center justify-content-center" [style.background]="r.color + '22'">
            <i class="fs-22" [class]="r.icon" [style.color]="r.color"></i>
          </div>
          <div class="flex-grow-1">
            <h3 class="mb-0 fw-bold" [style.color]="r.color">{{ countOf(r.id) }}</h3>
            <p class="mb-0 fs-12 text-muted">Permissions {{ r.label }}</p>
          </div>
          <button class="btn btn-sm btn-light" (click)="setRole(r.id)" [class.shadow]="currentRole===r.id">
            <i class="ri-eye-line"></i>
          </button>
        </div>
      </div>
    </div>
  }
</div>

<div class="card border-0 shadow-sm">
  <div class="card-header bg-transparent d-flex flex-wrap align-items-center gap-3 py-3">
    <h6 class="mb-0 fw-semibold flex-grow-1">
      <i class="ri-shield-keyhole-line me-2 text-primary"></i>Gestion des permissions
    </h6>
    <div class="btn-group btn-group-sm">
      @for (r of roles; track r.id) {
        <button class="btn" [class.btn-primary]="currentRole===r.id" [class.btn-light]="currentRole!==r.id"
                (click)="setRole(r.id)">{{ r.label }}</button>
      }
    </div>
    <button class="btn btn-sm btn-success rounded-pill px-3" (click)="openForm()">
      <i class="ri-add-line me-1"></i>Nouvelle ressource
    </button>
  </div>

  <div class="card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (filtered.length === 0) {
      <div class="text-center py-5 text-muted">Aucune permission pour ce rôle.</div>
    } @else {
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th class="ps-3">Ressource</th>
            <th class="text-center">Lire</th>
            <th class="text-center">Créer</th>
            <th class="text-center">Modifier</th>
            <th class="text-center">Supprimer</th>
            <th class="text-end pe-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (p of filtered; track p.idPermission) {
            <tr>
              <td class="ps-3 fw-semibold">{{ p.resource }}</td>
              <td class="text-center">
                <input type="checkbox" class="form-check-input" [(ngModel)]="p.canRead" (change)="save(p)">
              </td>
              <td class="text-center">
                <input type="checkbox" class="form-check-input" [(ngModel)]="p.canCreate" (change)="save(p)">
              </td>
              <td class="text-center">
                <input type="checkbox" class="form-check-input" [(ngModel)]="p.canUpdate" (change)="save(p)">
              </td>
              <td class="text-center">
                <input type="checkbox" class="form-check-input" [(ngModel)]="p.canDelete" (change)="save(p)">
              </td>
              <td class="text-end pe-3">
                <button class="btn btn-sm btn-light" (click)="remove(p)">
                  <i class="ri-delete-bin-line text-danger"></i>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  </div>
</div>

@if (showForm) {
  <div class="modal fade show d-block" style="background:rgba(0,0,0,.5)" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title">Nouvelle permission</h5>
          <button class="btn-close btn-close-white" (click)="showForm=false"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Rôle</label>
            <select class="form-select" [(ngModel)]="newPerm.idRole">
              @for (r of roles; track r.id) { <option [value]="r.id">{{ r.label }}</option> }
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Ressource</label>
            <input class="form-control" [(ngModel)]="newPerm.resource" placeholder="ex: products">
          </div>
          <div class="d-flex gap-3 flex-wrap">
            <div class="form-check"><input type="checkbox" class="form-check-input" [(ngModel)]="newPerm.canRead"><label class="form-check-label ms-1">Lire</label></div>
            <div class="form-check"><input type="checkbox" class="form-check-input" [(ngModel)]="newPerm.canCreate"><label class="form-check-label ms-1">Créer</label></div>
            <div class="form-check"><input type="checkbox" class="form-check-input" [(ngModel)]="newPerm.canUpdate"><label class="form-check-label ms-1">Modifier</label></div>
            <div class="form-check"><input type="checkbox" class="form-check-input" [(ngModel)]="newPerm.canDelete"><label class="form-check-label ms-1">Supprimer</label></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-light" (click)="showForm=false">Annuler</button>
          <button class="btn btn-primary" (click)="submit()">Créer</button>
        </div>
      </div>
    </div>
  </div>
}
`,
})
export class PermissionsAdminComponent implements OnInit {
  breadcrumbItems = [{ label: 'Admin', active: false }, { label: 'Permissions', active: true }];

  roles = [
    { id: 1, label: 'Admin',  color: '#f06548', icon: 'ri-shield-user-line' },
    { id: 3, label: 'Vendor', color: '#0ab39c', icon: 'ri-store-2-line' },
    { id: 2, label: 'Client', color: '#405189', icon: 'ri-user-3-line' },
  ];

  countOf(roleId: number): number { return this.items.filter(p => p.idRole === roleId).length; }

  currentRole = 1;
  items: Perm[] = [];
  filtered: Perm[] = [];
  loading = true;
  showForm = false;
  newPerm: Perm = { idRole: 1, resource: '', canRead: true, canCreate: false, canUpdate: false, canDelete: false };

  constructor(private api: TijaraApiService, private permissions: PermissionsService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.permissions.getPermissions({ per_page: 200 }).subscribe({
      next: (r: any[]) => {
        this.items = (r || []).map((p: any) => ({
          idPermission: p.id_permission ?? p.idPermission ?? p.IdPermission,
          idRole:      +(p.id_role      ?? p.idRole       ?? p.IdRole ?? 0),
          resource:     p.resource      ?? p.Resource     ?? '',
          canRead:    !!(p.can_read     ?? p.canRead      ?? p.CanRead),
          canCreate:  !!(p.can_create   ?? p.canCreate    ?? p.CanCreate),
          canUpdate:  !!(p.can_update   ?? p.canUpdate    ?? p.CanUpdate),
          canDelete:  !!(p.can_delete   ?? p.canDelete    ?? p.CanDelete),
        }));
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.items = []; this.filtered = []; this.loading = false; }
    });
  }

  setRole(id: number): void { this.currentRole = id; this.applyFilter(); }
  applyFilter(): void { this.filtered = this.items.filter(p => p.idRole === this.currentRole); }

  save(p: Perm): void {
   
    const payload = {
      IdRole: p.idRole, Resource: p.resource,
      CanRead: p.canRead, CanCreate: p.canCreate, CanUpdate: p.canUpdate, CanDelete: p.canDelete,
    };
    const op = p.idPermission
      ? this.permissions.updatePermission(p.idPermission, payload)
      : this.permissions.savePermission(payload);
    op.subscribe();
  }

  openForm(): void {
    this.newPerm = { idRole: this.currentRole, resource: '', canRead: true, canCreate: false, canUpdate: false, canDelete: false };
    this.showForm = true;
  }
  submit(): void {
    if (!this.newPerm.resource.trim()) { alert('Ressource requise'); return; }
    const payload = {
      IdRole: this.newPerm.idRole, Resource: this.newPerm.resource,
      CanRead: this.newPerm.canRead, CanCreate: this.newPerm.canCreate,
      CanUpdate: this.newPerm.canUpdate, CanDelete: this.newPerm.canDelete,
    };
    this.permissions.savePermission(payload).subscribe({
      next: () => { this.showForm = false; this.load(); }
    });
  }
  remove(p: Perm): void {
    if (!p.idPermission || !confirm(`Supprimer la permission "${p.resource}" ?`)) return;
    this.permissions.deletePermission(p.idPermission).subscribe({ next: () => this.load() });
  }
}
