import { Component, OnInit } from '@angular/core';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { TransportsService } from 'src/app/core/services/transports.service';

interface TransportRow {
  idTransport: number;
  name: string;
  logo: string;
  phone: string;
  email: string;
  deliveryFee: number;
  freeFrom: number | null;
  zones: string;
  active: boolean;
  createdAt: string | null;
  zoneCount: number;
  zoneKey: 'tunis' | 'sousse' | 'sfax' | 'autres';
}

interface ZoneStat { label: string; count: number; pct: number; color: string; }
interface Alert { icon: string; type: 'warn' | 'danger'; text: string; sub: string; }
interface ActivityItem { icon: string; color: string; title: string; sub: string; when: string; }

@Component({
  selector: 'app-transports-admin',
  standalone: false,
  template: `
<!-- ═════ Hero Header ═════ -->
<div class="trp-hero mb-4">
  <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
    <div>
      <div class="d-flex align-items-center gap-2 mb-1">
        <span class="trp-breadcrumb">Admin <i class="ri-arrow-right-s-line"></i> Transporteurs</span>
      </div>
      <h1 class="trp-hero-title">Transporteurs</h1>
      <p class="trp-hero-sub">Gérez vos transporteurs et suivez leurs performances</p>
    </div>

    <div class="d-flex align-items-center gap-2">
      <button class="trp-btn-secondary" (click)="load()">
        <i class="ri-download-2-line me-1"></i>Importer
      </button>
      <button class="trp-btn-secondary" (click)="exportCsv()">
        <i class="ri-upload-2-line me-1"></i>Exporter
      </button>
      <button class="trp-btn-primary" (click)="openAdd()">
        <i class="ri-add-line me-1"></i>Nouveau transporteur
      </button>
    </div>
  </div>
</div>

<!-- ═════ KPI Cards ═════ -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="trp-kpi">
      <div class="trp-kpi-top">
        <span class="trp-kpi-icon" style="background:#e8f4ff;color:#299cdb"><i class="ri-truck-line"></i></span>
      </div>
      <div class="trp-kpi-label">TOTAL TRANSPORTEURS</div>
      <div class="trp-kpi-value">{{ items.length }}</div>
      <div class="trp-kpi-sub">{{ activeCount }} actifs · {{ items.length - activeCount }} inactifs</div>
      <svg class="trp-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,25 15,20 30,22 45,15 60,18 80,10" fill="none" stroke="#299cdb" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="trp-kpi">
      <div class="trp-kpi-top">
        <span class="trp-kpi-icon" style="background:#e0f9f5;color:#0ab39c"><i class="ri-checkbox-circle-line"></i></span>
      </div>
      <div class="trp-kpi-label">ACTIFS</div>
      <div class="trp-kpi-value">{{ activeCount }}</div>
      <div class="trp-kpi-sub">{{ activePct }}% du total</div>
      <svg class="trp-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,28 15,22 30,18 45,20 60,12 80,8" fill="none" stroke="#0ab39c" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="trp-kpi">
      <div class="trp-kpi-top">
        <span class="trp-kpi-icon" style="background:#fef9e7;color:#f7b84b"><i class="ri-money-dollar-circle-line"></i></span>
      </div>
      <div class="trp-kpi-label">FRAIS MOYEN</div>
      <div class="trp-kpi-value">{{ avgFee | number:'1.2-2' }} <span class="trp-kpi-unit">TND</span></div>
      <div class="trp-kpi-sub">de {{ minFee | number:'1.2-2' }} à {{ maxFee | number:'1.2-2' }} TND</div>
      <svg class="trp-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,15 15,20 30,12 45,22 60,16 80,24" fill="none" stroke="#f7b84b" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="trp-kpi">
      <div class="trp-kpi-top">
        <span class="trp-kpi-icon" style="background:#efeaff;color:#564ab1"><i class="ri-gift-line"></i></span>
      </div>
      <div class="trp-kpi-label">AVEC LIVRAISON GRATUITE</div>
      <div class="trp-kpi-value">{{ withFreeShippingCount }}</div>
      <div class="trp-kpi-sub">{{ freeShippingPct }}% du total</div>
      <svg class="trp-spark" viewBox="0 0 80 30" preserveAspectRatio="none">
        <polyline points="0,28 15,24 30,20 45,16 60,10 80,6" fill="none" stroke="#564ab1" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  </div>
</div>

<!-- ═════ Analyse : donut / tarifs / carte / top ═════ -->
<div class="row g-3 mb-3 align-items-stretch">
  <!-- Répartition par zone -->
  <div class="col-lg-3 col-md-6">
    <div class="trp-card h-100">
      <div class="trp-card-header"><h6 class="mb-0 fw-semibold fs-13">Répartition par zone</h6></div>
      <div class="trp-card-body d-flex flex-column align-items-center">
        <svg viewBox="0 0 120 120" width="130" height="130" class="mb-2">
          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--trp-donut-track,#f1f2f7)" stroke-width="16"/>
          @for (seg of zoneStats; track seg.label) {
            <circle cx="60" cy="60" r="48" fill="none" [attr.stroke]="seg.color" stroke-width="16"
                    stroke-linecap="butt"
                    [attr.stroke-dasharray]="(seg.pct/100*301.6) + ' ' + (301.6 - seg.pct/100*301.6)"
                    [attr.stroke-dashoffset]="-seg.offset"
                    transform="rotate(-90 60 60)"/>
          }
          <text x="60" y="56" text-anchor="middle" class="trp-donut-num">{{ items.length }}</text>
          <text x="60" y="72" text-anchor="middle" class="trp-donut-lbl">Total</text>
        </svg>
        <div class="trp-legend w-100">
          @for (seg of zoneStats; track seg.label) {
            <div class="trp-legend-row">
              <span class="trp-legend-dot" [style.background]="seg.color"></span>
              <span class="trp-legend-label">{{ seg.label }}</span>
              <span class="trp-legend-val">{{ seg.pct }}% ({{ seg.count }})</span>
            </div>
          }
        </div>
      </div>
    </div>
  </div>

  <!-- Aperçu tarifaire -->
  <div class="col-lg-3 col-md-6">
    <div class="trp-card h-100">
      <div class="trp-card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0 fw-semibold fs-13">Aperçu tarifaire</h6>
        <span class="trp-badge-soft">Temps réel</span>
      </div>
      <div class="trp-card-body">
        <div class="trp-metric-row">
          <span>Livraison gratuite</span>
          <span class="trp-metric-val trp-c-success">{{ freeShippingPct }}%</span>
        </div>
        <div class="trp-progress-track"><div class="trp-progress-fill trp-bg-success" [style.width.%]="freeShippingPct"></div></div>

        <div class="trp-metric-row mt-3">
          <span>Transporteurs actifs</span>
          <span class="trp-metric-val trp-c-info">{{ activePct }}%</span>
        </div>
        <div class="trp-progress-track"><div class="trp-progress-fill trp-bg-info" [style.width.%]="activePct"></div></div>

        <div class="trp-mini-stats mt-3">
          <div><span class="trp-mini-lbl">Moins cher</span><span class="trp-mini-val">{{ cheapest?.name || '—' }} · {{ (cheapest?.deliveryFee || 0) | number:'1.2-2' }} TND</span></div>
          <div><span class="trp-mini-lbl">Plus cher</span><span class="trp-mini-val">{{ priciest?.name || '—' }} · {{ (priciest?.deliveryFee || 0) | number:'1.2-2' }} TND</span></div>
          <div><span class="trp-mini-lbl">Seuil gratuité moyen</span><span class="trp-mini-val">{{ avgFreeFrom | number:'1.2-2' }} TND</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Couverture des zones (carte schématique) -->
  <div class="col-lg-3 col-md-6">
    <div class="trp-card h-100">
      <div class="trp-card-header"><h6 class="mb-0 fw-semibold fs-13">Couverture des zones</h6></div>
      <div class="trp-card-body">
        <svg viewBox="0 0 200 160" class="trp-map">
          <ellipse cx="95" cy="42" rx="55" ry="30" [attr.fill]="zoneColor('tunis')" opacity="0.28"/>
          <ellipse cx="90" cy="88" rx="42" ry="24" [attr.fill]="zoneColor('sousse')" opacity="0.28"/>
          <ellipse cx="110" cy="126" rx="38" ry="22" [attr.fill]="zoneColor('sfax')" opacity="0.28"/>
          <circle cx="150" cy="60" r="10" [attr.fill]="zoneColor('autres')" opacity="0.35"/>
          <circle cx="95" cy="42" r="4" [attr.fill]="zoneColor('tunis')"/>
          <circle cx="90" cy="88" r="4" [attr.fill]="zoneColor('sousse')"/>
          <circle cx="110" cy="126" r="4" [attr.fill]="zoneColor('sfax')"/>
          <circle cx="150" cy="60" r="4" [attr.fill]="zoneColor('autres')"/>
        </svg>
        <p class="trp-map-hint">Carte schématique — proportionnelle au nombre de transporteurs par zone</p>
        <div class="trp-legend">
          @for (seg of zoneStats; track seg.label) {
            <div class="trp-legend-row">
              <span class="trp-legend-dot" [style.background]="seg.color"></span>
              <span class="trp-legend-label">{{ seg.label }}</span>
              <span class="trp-legend-val">{{ seg.pct }}% ({{ seg.count }})</span>
            </div>
          }
        </div>
      </div>
    </div>
  </div>

  <!-- Top transporteurs -->
  <div class="col-lg-3 col-md-6">
    <div class="trp-card h-100">
      <div class="trp-card-header"><h6 class="mb-0 fw-semibold fs-13">Top transporteurs</h6><span class="trp-badge-soft">Couverture</span></div>
      <div class="trp-card-body">
        @for (t of topByCoverage; track t.idTransport; let i = $index) {
          <div class="trp-top-row">
            <span class="trp-top-rank">{{ i + 1 }}</span>
            <div class="trp-top-info">
              <div class="trp-top-name">{{ t.name }}</div>
              <div class="trp-progress-track sm"><div class="trp-progress-fill trp-bg-info" [style.width.%]="coveragePct(t)"></div></div>
            </div>
            <span class="trp-top-pct">{{ coveragePct(t) }}%</span>
          </div>
        }
        @if (!topByCoverage.length) { <p class="trp-empty-hint">Aucune donnée.</p> }
      </div>
    </div>
  </div>
</div>

<!-- ═════ Activité récente / Alertes ═════ -->
<div class="row g-3 mb-4 align-items-stretch">
  <div class="col-lg-6">
    <div class="trp-card h-100">
      <div class="trp-card-header"><h6 class="mb-0 fw-semibold fs-13">Activité récente</h6></div>
      <div class="trp-card-body">
        @for (a of recentActivity; track a.title + a.when) {
          <div class="trp-activity-row">
            <span class="trp-activity-icon" [style.background]="a.color + '22'" [style.color]="a.color"><i [class]="a.icon"></i></span>
            <div class="trp-activity-info">
              <div class="trp-activity-title">{{ a.title }}</div>
              <div class="trp-activity-sub">{{ a.sub }}</div>
            </div>
            <span class="trp-activity-when">{{ a.when }}</span>
          </div>
        }
        @if (!recentActivity.length) { <p class="trp-empty-hint">Aucune activité récente.</p> }
      </div>
    </div>
  </div>

  <div class="col-lg-6">
    <div class="trp-card h-100">
      <div class="trp-card-header"><h6 class="mb-0 fw-semibold fs-13">Alertes &amp; notifications</h6></div>
      <div class="trp-card-body">
        @for (al of alerts; track al.text) {
          <div class="trp-alert" [class.warn]="al.type==='warn'" [class.danger]="al.type==='danger'">
            <i [class]="al.icon"></i>
            <div><div class="trp-alert-text">{{ al.text }}</div><div class="trp-alert-sub">{{ al.sub }}</div></div>
          </div>
        }
        @if (!alerts.length) { <p class="trp-empty-hint">Aucune alerte — tout est en ordre.</p> }
      </div>
    </div>
  </div>
</div>

<!-- ═════ Table ═════ -->
<div class="trp-card">
  <div class="trp-card-header d-flex flex-wrap align-items-center gap-2">
    <div class="flex-grow-1">
      <div class="d-flex align-items-center gap-2">
        <h6 class="mb-0 fw-bold fs-15">Liste des transporteurs</h6>
        <span class="trp-count-badge">{{ totalItems }}</span>
      </div>
    </div>
    <div class="trp-search">
      <i class="ri-search-line trp-search-ic"></i>
      <input type="text" class="trp-search-input" placeholder="Nom, zones, téléphone…"
             [(ngModel)]="search" (input)="onSearchChange()" />
    </div>
    <select class="trp-select" [(ngModel)]="statusFilter" (change)="applyFilter()">
      <option value="">Tous les statuts</option>
      <option value="active">Actifs</option>
      <option value="inactive">Inactifs</option>
    </select>
    <select class="trp-select" [(ngModel)]="zoneFilter" (change)="applyFilter()">
      <option value="">Toutes les zones</option>
      <option value="tunis">Tunis / Grand Tunis</option>
      <option value="sousse">Sousse</option>
      <option value="sfax">Sfax</option>
      <option value="autres">Autres</option>
    </select>
  </div>

  <div class="trp-card-body p-0">
    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border" style="color:#7c6ef5"></div></div>
    } @else if (paginated.length === 0) {
      <div class="text-center py-5">
        <i class="ri-truck-line display-3 trp-c-muted opacity-50"></i>
        <p class="trp-c-muted mt-2 mb-3">Aucun transporteur.</p>
        <button class="trp-btn-primary" (click)="openAdd()"><i class="ri-add-line me-1"></i>Ajouter le premier</button>
      </div>
    } @else {
      <div class="table-responsive">
        <table class="table trp-table align-middle mb-0">
          <thead>
            <tr>
              <th class="ps-4">Transporteur</th>
              <th>Contact</th>
              <th class="text-end">Frais</th>
              <th class="text-end">Gratuit dès</th>
              <th>Zones couvertes</th>
              <th class="text-center">Statut</th>
              <th>Couverture</th>
              <th class="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (t of paginated; track t.idTransport) {
              <tr>
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-2">
                    @if (t.logo) {
                      <img [src]="t.logo" alt="" class="trp-logo" (error)="t.logo=''" />
                    } @else {
                      <div class="trp-logo-fallback" [style.background]="zoneColor(t.zoneKey) + '22'" [style.color]="zoneColor(t.zoneKey)">
                        {{ t.name.charAt(0).toUpperCase() }}
                      </div>
                    }
                    <div>
                      <div class="fw-semibold fs-13">{{ t.name }}</div>
                      @if (t.email) { <div class="fs-11 trp-c-muted">{{ t.email }}</div> }
                    </div>
                  </div>
                </td>
                <td class="fs-12">
                  @if (t.phone) { <span><i class="ri-phone-line trp-c-muted me-1"></i>{{ t.phone }}</span> }
                  @else { <span class="trp-c-muted">—</span> }
                </td>
                <td class="text-end fw-semibold">{{ t.deliveryFee | number:'1.2-2' }} TND</td>
                <td class="text-end fs-12">
                  @if (t.freeFrom && t.freeFrom > 0) {
                    <span class="trp-pill trp-pill-success">{{ t.freeFrom | number:'1.0-0' }} TND</span>
                  } @else { <span class="trp-c-muted">—</span> }
                </td>
                <td class="fs-12 trp-c-muted text-truncate" style="max-width:180px">{{ t.zones || '—' }}</td>
                <td class="text-center">
                  @if (t.active) { <span class="trp-pill trp-pill-success">Actif</span> }
                  @else { <span class="trp-pill trp-pill-muted">Inactif</span> }
                </td>
                <td style="min-width:110px">
                  <div class="d-flex align-items-center gap-2">
                    <div class="trp-progress-track sm flex-grow-1"><div class="trp-progress-fill trp-bg-info" [style.width.%]="coveragePct(t)"></div></div>
                    <span class="fs-11 trp-c-muted">{{ coveragePct(t) }}%</span>
                  </div>
                </td>
                <td class="text-end pe-4">
                  <div class="d-flex gap-1 justify-content-end">
                    <button class="trp-action-btn" (click)="openEdit(t)" title="Modifier"><i class="ri-edit-2-line"></i></button>
                    <button class="trp-action-btn" (click)="toggle(t)" [title]="t.active ? 'Désactiver' : 'Activer'">
                      <i [class]="t.active ? 'ri-pause-circle-line' : 'ri-play-circle-line'"></i>
                    </button>
                    <button class="trp-action-btn danger" (click)="remove(t)" title="Supprimer"><i class="ri-delete-bin-line"></i></button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="trp-pagination">
        <div class="trp-pagination-info">
          Affichage de {{ totalItems ? (page - 1) * pageSize + 1 : 0 }} à {{ min((page) * pageSize, totalItems) }} sur {{ totalItems }} transporteurs
        </div>
        <div class="d-flex align-items-center gap-3">
          <div class="trp-pagination-controls">
            <button class="trp-page-btn" [disabled]="page === 1" (click)="goToPage(page - 1)"><i class="ri-arrow-left-s-line"></i></button>
            @for (p of pageNumbers; track p) {
              <button class="trp-page-btn" [class.active]="p === page" (click)="goToPage(p)">{{ p }}</button>
            }
            <button class="trp-page-btn" [disabled]="page === totalPages" (click)="goToPage(page + 1)"><i class="ri-arrow-right-s-line"></i></button>
          </div>
          <select class="trp-select sm" [(ngModel)]="pageSize" (change)="changePageSize()">
            <option [ngValue]="5">5 / page</option>
            <option [ngValue]="10">10 / page</option>
            <option [ngValue]="25">25 / page</option>
          </select>
        </div>
      </div>
    }
  </div>
</div>

<!-- ═════ Modal Ajout / Édition ═════ -->
@if (showForm) {
  <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" (click)="cancel($event)">
    <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
      <div class="modal-content border-0 shadow-lg trp-modal">
        <div class="modal-header trp-modal-header">
          <h5 class="modal-title fw-bold">
            <i class="ri-truck-line me-2"></i>{{ editingId ? 'Modifier le transporteur' : 'Nouveau transporteur' }}
          </h5>
          <button type="button" class="btn-close" (click)="cancel()"></button>
        </div>
        <div class="modal-body">
          @if (saveError) {
            <div class="alert alert-danger fs-13"><i class="ri-error-warning-line me-2"></i>{{ saveError }}</div>
          }
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Nom *</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.name" placeholder="Ex : Aramex Tunisie" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Téléphone</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.phone" placeholder="+216 71 100 100" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Email</label>
              <input type="email" class="form-control form-control-sm" [(ngModel)]="form.email" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">URL logo</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.logo" placeholder="https://…" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Frais (TND) *</label>
              <input type="number" min="0" step="0.001" class="form-control form-control-sm" [(ngModel)]="form.deliveryFee" />
            </div>
            <div class="col-md-6">
              <label class="form-label fs-12 fw-semibold">Livraison gratuite dès (TND)</label>
              <input type="number" min="0" step="0.001" class="form-control form-control-sm" [(ngModel)]="form.freeFrom" />
            </div>
            <div class="col-12">
              <label class="form-label fs-12 fw-semibold">Zones desservies</label>
              <input class="form-control form-control-sm" [(ngModel)]="form.zones" placeholder="Ex : Grand Tunis, Sfax, Sousse" />
            </div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="transp-active" [(ngModel)]="form.active" />
                <label class="form-check-label fs-13" for="transp-active">Transporteur actif</label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="trp-btn-secondary" (click)="cancel()" [disabled]="saving">Annuler</button>
          <button class="trp-btn-primary" (click)="save()" [disabled]="saving">
            @if (saving) { <span class="spinner-border spinner-border-sm me-1"></span> }
            <i class="ri-save-line me-1"></i> Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
}
`,
  styles: [`
    /* ═════ Hero ═════ */
    .trp-hero { padding: 24px 28px; background: linear-gradient(135deg, #f8f7ff 0%, #ffffff 55%, #f4f6ff 100%); border-radius: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
    .trp-breadcrumb { font-size: 12px; color: #9298a8; }
    .trp-hero-title { font-size: 1.9rem; font-weight: 800; color: #1a1f36; margin: 4px 0 4px; line-height: 1.2; }
    .trp-hero-sub { color: #6b7280; font-size: 13px; margin: 0; }

    .trp-btn-secondary { padding: 8px 16px; border: 1px solid #e9ebec; border-radius: 20px; background: #fff; color: #374151; font-size: 13px; cursor: pointer; transition: all .15s; }
    .trp-btn-secondary:hover { background: #f8f9ff; border-color: #7c6ef5; color: #7c6ef5; }
    .trp-btn-primary { padding: 8px 18px; border: none; border-radius: 20px; background: linear-gradient(135deg, #7c6ef5, #564ab1); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; }
    .trp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,110,245,.4); }
    .trp-btn-primary:disabled, .trp-btn-secondary:disabled { opacity: .6; cursor: not-allowed; }

    /* ═════ KPI ═════ */
    .trp-kpi { background: #fff; border-radius: 16px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(0,0,0,.07); position: relative; overflow: hidden; transition: transform .15s, box-shadow .15s; }
    .trp-kpi:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.12); }
    .trp-kpi-top { display: flex; align-items: center; margin-bottom: 10px; }
    .trp-kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .trp-kpi-label { font-size: 10px; font-weight: 700; letter-spacing: .06em; color: #9298a8; text-transform: uppercase; margin-bottom: 4px; }
    .trp-kpi-value { font-size: 26px; font-weight: 800; color: #1a1f36; line-height: 1; margin-bottom: 4px; }
    .trp-kpi-unit { font-size: 12px; font-weight: 600; color: #9298a8; }
    .trp-kpi-sub { font-size: 11px; color: #9298a8; margin-bottom: 8px; }
    .trp-spark { width: 100%; height: 26px; display: block; }

    /* ═════ Cards ═════ */
    .trp-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.07); overflow: hidden; }
    .trp-card-header { padding: 14px 18px; border-bottom: 1px solid #f0f0f5; }
    .trp-card-body { padding: 16px 18px; }
    .trp-count-badge { background: #eef0ff; color: #564ab1; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
    .trp-badge-soft { background: #eef0ff; color: #564ab1; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }

    /* ═════ Donut / légende ═════ */
    .trp-donut-num { font-size: 20px; font-weight: 800; fill: #1a1f36; }
    .trp-donut-lbl { font-size: 8px; fill: #9298a8; text-transform: uppercase; letter-spacing: .05em; }
    .trp-legend { display: flex; flex-direction: column; gap: 8px; }
    .trp-legend-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .trp-legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .trp-legend-label { color: #374151; flex: 1; }
    .trp-legend-val { color: #9298a8; font-weight: 600; }

    /* ═════ Metrics / progress ═════ */
    .trp-metric-row { display: flex; justify-content: space-between; font-size: 12px; color: #374151; margin-bottom: 6px; }
    .trp-metric-val { font-weight: 700; }
    .trp-c-success { color: #0ab39c; } .trp-c-info { color: #299cdb; } .trp-c-muted { color: #9298a8; }
    .trp-progress-track { height: 7px; border-radius: 20px; background: #f1f2f7; overflow: hidden; }
    .trp-progress-track.sm { height: 5px; }
    .trp-progress-fill { height: 100%; border-radius: 20px; transition: width .3s; }
    .trp-bg-success { background: linear-gradient(90deg,#0ab39c,#0dd4b8); }
    .trp-bg-info { background: linear-gradient(90deg,#299cdb,#5cb8ea); }
    .trp-mini-stats { display: flex; flex-direction: column; gap: 8px; }
    .trp-mini-stats > div { display: flex; flex-direction: column; gap: 2px; }
    .trp-mini-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #9298a8; font-weight: 700; }
    .trp-mini-val { font-size: 12px; color: #1a1f36; font-weight: 600; }

    /* ═════ Map ═════ */
    .trp-map { width: 100%; height: auto; max-height: 130px; margin-bottom: 6px; }
    .trp-map-hint { font-size: 10px; color: #9298a8; font-style: italic; margin-bottom: 10px; }

    /* ═════ Top transporteurs ═════ */
    .trp-top-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
    .trp-top-rank { width: 20px; height: 20px; border-radius: 6px; background: #eef0ff; color: #564ab1; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .trp-top-info { flex: 1; min-width: 0; }
    .trp-top-name { font-size: 12px; font-weight: 600; color: #1a1f36; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .trp-top-pct { font-size: 11px; font-weight: 700; color: #299cdb; flex-shrink: 0; }

    /* ═════ Activité ═════ */
    .trp-activity-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; }
    .trp-activity-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .trp-activity-info { flex: 1; min-width: 0; }
    .trp-activity-title { font-size: 12px; font-weight: 600; color: #1a1f36; }
    .trp-activity-sub { font-size: 11px; color: #9298a8; }
    .trp-activity-when { font-size: 10px; color: #9298a8; flex-shrink: 0; white-space: nowrap; }

    /* ═════ Alertes ═════ */
    .trp-alert { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; font-size: 12px; }
    .trp-alert:last-child { margin-bottom: 0; }
    .trp-alert.warn { background: #fef9e7; color: #a16207; }
    .trp-alert.danger { background: #fef2f0; color: #c0392b; }
    .trp-alert-text { font-weight: 700; }
    .trp-alert-sub { font-size: 11px; opacity: .85; }
    .trp-empty-hint { font-size: 12px; color: #9298a8; margin: 0; text-align: center; padding: 8px 0; }

    /* ═════ Table ═════ */
    .trp-search { position: relative; }
    .trp-search-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9298a8; font-size: 15px; }
    .trp-search-input { padding: 8px 14px 8px 36px; border: 1px solid #e9ebec; border-radius: 20px; font-size: 13px; outline: none; width: 200px; background: #fafbff; transition: border-color .15s; }
    .trp-search-input:focus { border-color: #7c6ef5; }
    .trp-select { border: 1px solid #e9ebec; border-radius: 20px; padding: 7px 12px; font-size: 12px; background: #fafbff; color: #374151; }
    .trp-select.sm { padding: 5px 10px; }

    .trp-table thead th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #9298a8; font-weight: 700; padding: 12px 10px; background: #f8f9ff; border-bottom: 1px solid #eef0f5; }
    .trp-table td { padding: 12px 10px; border-bottom: 1px solid #f5f6f9; }
    .trp-table tbody tr:hover { background: #fafbff; }
    .trp-table tbody tr:last-child td { border-bottom: none; }

    .trp-logo { width: 40px; height: 40px; border-radius: 10px; object-fit: contain; background: #f5f7fb; }
    .trp-logo-fallback { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; }

    .trp-pill { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; }
    .trp-pill-success { background: #dcfce7; color: #16a34a; }
    .trp-pill-muted { background: #f1f2f7; color: #6b7280; }

    .trp-action-btn { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e9ebec; background: #fff; cursor: pointer; font-size: 14px; color: #564ab1; display: inline-flex; align-items: center; justify-content: center; transition: all .15s; }
    .trp-action-btn:hover { background: #eef0ff; border-color: #7c6ef5; }
    .trp-action-btn.danger { color: #f06548; }
    .trp-action-btn.danger:hover { background: #fef2f0; border-color: #f06548; }

    /* ═════ Pagination ═════ */
    .trp-pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px 18px; border-top: 1px solid #f0f0f5; }
    .trp-pagination-info { font-size: 12px; color: #9298a8; }
    .trp-pagination-controls { display: flex; align-items: center; gap: 4px; }
    .trp-page-btn { min-width: 30px; height: 30px; padding: 0 8px; border: 1px solid #e9ebec; border-radius: 8px; background: #fff; color: #6b7280; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; }
    .trp-page-btn:hover:not(:disabled):not(.active) { background: #f8f9ff; border-color: #7c6ef5; color: #7c6ef5; }
    .trp-page-btn.active { background: #7c6ef5; border-color: #7c6ef5; color: #fff; }
    .trp-page-btn:disabled { opacity: .4; cursor: not-allowed; }

    /* ═════ Modal ═════ */
    .trp-modal-header { background: #eef0ff; }
    .trp-modal-header .modal-title { color: #564ab1; }

    /* ═════════════════════════════════════════════════
       Adaptation Dark Mode (préserve le même design)
       ═════════════════════════════════════════════════ */
    :host-context([data-bs-theme="dark"]) {
      .trp-hero { background: linear-gradient(135deg, var(--bs-tertiary-bg) 0%, var(--bs-body-bg) 55%, var(--bs-tertiary-bg) 100%); box-shadow: 0 1px 3px rgba(0,0,0,.3); }
      .trp-hero-title { color: var(--bs-emphasis-color); }
      .trp-hero-sub, .trp-breadcrumb { color: var(--bs-secondary-color); }

      .trp-btn-secondary { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .trp-btn-secondary:hover { background: var(--bs-secondary-bg); }

      .trp-kpi { background: var(--bs-card-bg); box-shadow: 0 2px 12px rgba(0,0,0,.35); }
      .trp-kpi:hover { box-shadow: 0 8px 24px rgba(0,0,0,.45); }
      .trp-kpi-label, .trp-kpi-sub, .trp-kpi-unit { color: var(--bs-secondary-color); }
      .trp-kpi-value { color: var(--bs-emphasis-color); }
      .trp-kpi-icon[style*="#e8f4ff"] { background: rgba(41,156,219,.2) !important; }
      .trp-kpi-icon[style*="#e0f9f5"] { background: rgba(10,179,156,.2) !important; }
      .trp-kpi-icon[style*="#fef9e7"] { background: rgba(247,184,75,.2) !important; }
      .trp-kpi-icon[style*="#efeaff"] { background: rgba(86,74,177,.25) !important; }

      .trp-card { background: var(--bs-card-bg); box-shadow: 0 2px 12px rgba(0,0,0,.35); }
      .trp-card-header { border-bottom-color: var(--bs-border-color); }
      .trp-count-badge, .trp-badge-soft { background: rgba(86,74,177,.25); color: #b9aef2; }

      .trp-donut-num { fill: var(--bs-emphasis-color); }
      .trp-donut-lbl { fill: var(--bs-secondary-color); }
      .trp-legend-label { color: var(--bs-body-color); }
      .trp-legend-val { color: var(--bs-secondary-color); }

      .trp-metric-row { color: var(--bs-body-color); }
      .trp-progress-track { background: var(--bs-tertiary-bg); }
      .trp-mini-lbl { color: var(--bs-secondary-color); }
      .trp-mini-val { color: var(--bs-emphasis-color); }
      .trp-map-hint { color: var(--bs-secondary-color); }

      .trp-top-rank { background: rgba(86,74,177,.25); color: #b9aef2; }
      .trp-top-name { color: var(--bs-emphasis-color); }
      .trp-activity-title { color: var(--bs-emphasis-color); }
      .trp-activity-sub, .trp-activity-when { color: var(--bs-secondary-color); }
      .trp-empty-hint { color: var(--bs-secondary-color); }

      .trp-search-input, .trp-select { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .trp-search-ic { color: var(--bs-secondary-color); }

      .trp-table thead th { background: var(--bs-tertiary-bg); border-bottom-color: var(--bs-border-color); color: var(--bs-secondary-color); }
      .trp-table td { border-bottom-color: var(--bs-border-color); }
      .trp-table tbody tr:hover { background: var(--bs-tertiary-bg) !important; }
      .trp-logo { background: var(--bs-tertiary-bg); }
      .trp-pill-muted { background: var(--bs-tertiary-bg); color: var(--bs-secondary-color); }
      .trp-action-btn { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }

      .trp-pagination { border-top-color: var(--bs-border-color); }
      .trp-pagination-info { color: var(--bs-secondary-color); }
      .trp-page-btn { background: var(--bs-tertiary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
      .trp-page-btn:hover:not(:disabled):not(.active) { background: var(--bs-secondary-bg); }

      .trp-modal-header { background: rgba(86,74,177,.2); }
    }
  `],
})
export class TransportsAdminComponent implements OnInit {
  breadcrumbItems = [{ label: 'Admin' }, { label: 'Transporteurs', active: true }];

  items:    TransportRow[] = [];
  search = '';
  statusFilter: '' | 'active' | 'inactive' = '';
  zoneFilter: '' | 'tunis' | 'sousse' | 'sfax' | 'autres' = '';
  loading = true;
  totalItems = 0;
  private searchDebounce: any = null;

  page = 1;
  pageSize = 5;

  showForm = false;
  saving   = false;
  saveError = '';
  editingId: number | null = null;
  form = { name: '', phone: '', email: '', logo: '', deliveryFee: 0, freeFrom: 0, zones: '', active: true };

  zoneStats: (ZoneStat & { offset: number })[] = [];
  alerts: Alert[] = [];
  recentActivity: ActivityItem[] = [];

  private zoneColors: Record<string, string> = { tunis: '#6c5ce7', sousse: '#0ab39c', sfax: '#f7b84b', autres: '#f06548' };
  private zoneLabels: Record<string, string> = { tunis: 'Tunis / Grand Tunis', sousse: 'Sousse', sfax: 'Sfax', autres: 'Autres' };

  activeCount = 0;
  activePct = 0;
  withFreeShippingCount = 0;
  freeShippingPct = 0;
  avgFee = 0;
  minFee = 0;
  maxFee = 0;
  avgFreeFrom = 0;
  cheapest: TransportRow | null = null;
  priciest: TransportRow | null = null;
  maxZoneCount = 1;
  topByCoverage: TransportRow[] = [];

  totalPages = 1;
  pageNumbers: number[] = [];
  paginated: TransportRow[] = [];

 
  private recomputeStats(): void {
    this.activeCount = this.items.filter(t => t.active).length;
    this.activePct = this.items.length ? Math.round(this.activeCount / this.items.length * 100) : 0;
    this.withFreeShippingCount = this.items.filter(t => (t.freeFrom || 0) > 0).length;
    this.freeShippingPct = this.items.length ? Math.round(this.withFreeShippingCount / this.items.length * 100) : 0;
    this.avgFee = this.items.length ? this.items.reduce((s, t) => s + (+t.deliveryFee || 0), 0) / this.items.length : 0;
    this.minFee = this.items.length ? Math.min(...this.items.map(t => +t.deliveryFee || 0)) : 0;
    this.maxFee = this.items.length ? Math.max(...this.items.map(t => +t.deliveryFee || 0)) : 0;
    const withThreshold = this.items.filter(t => (t.freeFrom || 0) > 0);
    this.avgFreeFrom = withThreshold.length ? withThreshold.reduce((s, t) => s + (t.freeFrom || 0), 0) / withThreshold.length : 0;
    this.cheapest = this.items.length ? [...this.items].sort((a, b) => a.deliveryFee - b.deliveryFee)[0] : null;
    this.priciest = this.items.length ? [...this.items].sort((a, b) => b.deliveryFee - a.deliveryFee)[0] : null;
    this.maxZoneCount = this.items.length ? Math.max(1, ...this.items.map(t => t.zoneCount)) : 1;
    this.topByCoverage = [...this.items].sort((a, b) => b.zoneCount - a.zoneCount).slice(0, 5);
  }

  min(a: number, b: number): number { return Math.min(a, b); }
  zoneColor(key: string): string { return this.zoneColors[key] || this.zoneColors['autres']; }
  coveragePct(t: TransportRow): number { return Math.round((t.zoneCount / this.maxZoneCount) * 100); }

  constructor(private api: TijaraApiService, private transports: TransportsService) {}

  ngOnInit(): void { this.load(); }

  private normalize(s: string): string {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private classifyZone(zonesRaw: string): 'tunis' | 'sousse' | 'sfax' | 'autres' {
    const z = this.normalize(zonesRaw);
    // Couverture nationale ("Toute la Tunisie", "National"...) : pas une zone précise -> Autres
    if (/\btoute\b.*tunisie|\bnational/.test(z)) return 'autres';
    // \b = limite de mot, pour ne pas confondre "Tunis" avec "Tunisie"
    if (/\btunis\b/.test(z)) return 'tunis';
    if (/\bsousse\b/.test(z)) return 'sousse';
    if (/\bsfax\b/.test(z)) return 'sfax';
    return 'autres';
  }

  private countZones(zonesRaw: string): number {
    if (!zonesRaw?.trim()) return 0;
    return zonesRaw.split(',').map(s => s.trim()).filter(Boolean).length;
  }

  private timeAgo(iso: string | null): string {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    if (isNaN(diffMs) || diffMs < 0) return '';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `il y a ${days}j`;
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  load(): void {
    this.loading = true;
    // Fetch complet : sert aux KPI/graphiques (zoneStats, alerts, activité,
    // top couverture) qui doivent porter sur tous les transporteurs.
    this.transports.getTransports({ per_page: 200 }).subscribe({
      next: (res: any) => {
        const r: any[] = res?.data || [];
        this.items = (r || []).map((t: any) => this.mapRow(t));
        this.computeZoneStats();
        this.computeAlerts();
        this.computeActivity();
        this.recomputeStats();
        this.loadTable();
      },
      error: () => { this.items = []; this.loading = false; alert('Chargement impossible.'); }
    });
  }

  private mapRow(t: any): TransportRow {
    const zones = t.Zones ?? '';
    return {
      idTransport: t.IdTransport,
      name:         t.Name          ?? '',
      logo:         t.Logo          ?? '',
      phone:        t.Phone         ?? '',
      email:        t.Email         ?? '',
      deliveryFee: +(t.DeliveryFee  ?? 0),
      freeFrom:    (t.FreeFrom      ?? null) as number | null,
      zones,
      active:    !!t.Active,
      createdAt:    t.CreatedAt    ?? null,
      zoneCount:    this.countZones(zones),
      zoneKey:      this.classifyZone(zones),
    };
  }

  private computeZoneStats(): void {
    const total = this.items.length || 1;
    const buckets: Record<string, number> = { tunis: 0, sousse: 0, sfax: 0, autres: 0 };
    this.items.forEach(t => buckets[t.zoneKey]++);
    let offset = 0;
    const circumference = 301.6;
    this.zoneStats = (['tunis', 'sousse', 'sfax', 'autres'] as const)
      .map(key => {
        const count = buckets[key];
        const pct = Math.round((count / total) * 100);
        const stat = { label: this.zoneLabels[key], count, pct, color: this.zoneColors[key], offset };
        offset += (pct / 100) * circumference;
        return stat;
      })
      .filter(s => s.count > 0);
  }

  private computeAlerts(): void {
    const alerts: Alert[] = [];
    const inactive = this.items.filter(t => !t.active).length;
    const noZone = this.items.filter(t => t.zoneCount === 0).length;
    const noContact = this.items.filter(t => !t.phone && !t.email).length;
    if (inactive > 0) alerts.push({ icon: 'ri-pause-circle-line', type: 'warn', text: `${inactive} transporteur(s) inactif(s)`, sub: 'Vérifiez s\'ils doivent être réactivés' });
    if (noZone > 0) alerts.push({ icon: 'ri-map-pin-line', type: 'danger', text: `${noZone} transporteur(s) sans zone assignée`, sub: 'Complétez leurs informations' });
    if (noContact > 0) alerts.push({ icon: 'ri-error-warning-line', type: 'warn', text: `${noContact} transporteur(s) sans contact`, sub: 'Aucun téléphone ni email renseigné' });
    this.alerts = alerts;
  }

  private computeActivity(): void {
    this.recentActivity = [...this.items]
      .filter(t => !!t.createdAt)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 5)
      .map(t => ({
        icon: 'ri-truck-line',
        color: this.zoneColor(t.zoneKey),
        title: 'Transporteur ajouté',
        sub: t.name,
        when: this.timeAgo(t.createdAt),
      }));
  }

  applyFilter(): void { this.page = 1; this.loadTable(); }

  private buildTableParams(): any {
    const params: any = { page: this.page, per_page: this.pageSize };
    if (this.search.trim()) params.search = this.search.trim();
    if (this.statusFilter) params.Active = this.statusFilter === 'active' ? 1 : 0;
    return params;
  }

  // Table paginée/recherchée côté backend. `zoneFilter` reste un filtre
  // client (la zone est une catégorie dérivée du texte 'Zones', pas une
  // colonne backend) : il s'applique donc uniquement à la page reçue.
  loadTable(): void {
    this.transports.getTransports(this.buildTableParams()).subscribe({
      next: (res: any) => {
        let rows: TransportRow[] = (res?.data || []).map((t: any) => this.mapRow(t));
        if (this.zoneFilter) rows = rows.filter(t => t.zoneKey === this.zoneFilter);
        this.paginated  = rows;
        this.totalItems = res?.total        ?? rows.length;
        this.totalPages = res?.last_page    ?? 1;
        this.page       = res?.current_page ?? this.page;
        this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => { this.page = 1; this.loadTable(); }, 400);
  }

  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages && p !== this.page) { this.page = p; this.loadTable(); } }
  changePageSize(): void { this.page = 1; this.loadTable(); }

  exportCsv(): void {
    if (!this.items.length) return;
    const header = ['Nom', 'Téléphone', 'Email', 'Frais', 'Gratuit dès', 'Zones', 'Statut'];
    const rows = this.items.map(t => [t.name, t.phone, t.email, t.deliveryFee, t.freeFrom ?? '', t.zones, t.active ? 'Actif' : 'Inactif']);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transporteurs.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  openAdd(): void {
    this.editingId = null; this.saveError = '';
    this.form = { name: '', phone: '', email: '', logo: '', deliveryFee: 0, freeFrom: 0, zones: '', active: true };
    this.showForm = true;
  }
  openEdit(t: TransportRow): void {
    this.editingId = t.idTransport; this.saveError = '';
    this.form = {
      name: t.name, phone: t.phone, email: t.email, logo: t.logo,
      deliveryFee: t.deliveryFee, freeFrom: t.freeFrom || 0, zones: t.zones, active: t.active,
    };
    this.showForm = true;
  }
  cancel(_ev?: Event): void { this.showForm = false; this.saving = false; this.saveError = ''; }

  save(): void {
    if (!this.form.name?.trim()) { this.saveError = 'Le nom est requis.'; return; }
    this.saving = true; this.saveError = '';
    const payload = {
      Name: this.form.name, Phone: this.form.phone, Email: this.form.email, Logo: this.form.logo,
      DeliveryFee: +this.form.deliveryFee || 0,
      FreeFrom: this.form.freeFrom > 0 ? +this.form.freeFrom : null,
      Zones: this.form.zones, Active: this.form.active,
    };
    const op = this.editingId
      ? this.transports.updateTransport(this.editingId, payload)
      : this.transports.createTransport(payload);
    op.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: (err) => { this.saving = false; this.saveError = err?.error?.message || 'Erreur d\'enregistrement.'; },
    });
  }

  toggle(t: TransportRow): void {
    this.transports.toggleTransport(t.idTransport).subscribe({
      next: () => { this.load(); },
      error: () => alert('Action impossible.'),
    });
  }
  remove(t: TransportRow): void {
    if (!confirm(`Supprimer le transporteur "${t.name}" ?`)) return;
    this.transports.deleteTransport(t.idTransport).subscribe({
      next: () => { this.load(); },
      error: () => alert('Suppression impossible (peut-être référencé par des livraisons).'),
    });
  }
}