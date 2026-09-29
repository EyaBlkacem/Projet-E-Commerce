import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { CatalogAdminService } from 'src/app/core/services/catalog-admin.service';

export interface CrudField {
    key:       string;
    label:     string;
    type:      'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'email' | 'select';
    required?: boolean;
    min?:      number;
    max?:      number;
    step?:     number;
    options?:  { value: any; label: string }[];
    colSize?:  number; // col-md-N (default 6)
    hint?:     string;
    default?:  any;
}

export interface CrudConfig {
    title:       string;        // "Marques"
    icon:        string;         // "ri-flag-line"
    apiPath:     string;         // "brands"
    idField:     string;         // "id_brand"
    listColumns: { key: string; label: string; type?: 'text'|'boolean'|'date'|'number'|'badge' }[];
    fields:      CrudField[];
    breadcrumb:  string;
    searchFields?: string[];
}

@Component({
    selector: 'app-admin-crud',
    templateUrl: './admin-crud.component.html',
    styleUrls: ['./admin-crud.component.scss'],
    standalone: false
})
export class AdminCrudComponent implements OnInit {

    @Input() config!: CrudConfig;

    breadCrumbItems: any[] = [];
    items:   any[] = [];
    filtered: any[] = [];
    loading  = true;
    searchTerm = '';
    statusFilter: 'all' | 'active' | 'inactive' = 'all';

    form!: FormGroup;
    showForm = false;
    editingId: any = null;
    saving    = false;
    saveError = '';
    saveOk    = '';
    submitted = false;

    constructor(private fb: FormBuilder, private api: TijaraApiService, private catalogAdmin: CatalogAdminService) {}

    ngOnInit(): void {
        this.breadCrumbItems = [{ label: 'Admin' }, { label: this.config.breadcrumb, active: true }];
        this.initForm();
        this.load();
    }

    // ── Loading ──────────────────────────────────────────────────────

    load(): void {
        this.loading = true;
        this.catalogAdmin.adminList(this.config.apiPath).subscribe({
            next: (data: any[]) => {
                this.items = (data || []).map(it => this.normalizeItem(it));
                this.applyFilters();
                this.loading = false;
            },
            error: () => { this.loading = false; }
        });
    }

    /** Normalize pascalCase/snake_case keys */
    private normalizeItem(item: any): any {
        const out: any = { ...item };
        Object.keys(item).forEach(k => {
            const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            if (!(snake in out)) out[snake] = item[k];
        });
        return out;
    }

    getItemId(item: any): any {
        // try multiple naming conventions
        const keys = [this.config.idField, this.toCamel(this.config.idField), this.toPascal(this.config.idField)];
        for (const k of keys) { if (item[k] != null) return item[k]; }
        return null;
    }

    private toCamel(s: string): string { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
    private toPascal(s: string): string { const c = this.toCamel(s); return c.charAt(0).toUpperCase() + c.slice(1); }

    // ── Filters ──────────────────────────────────────────────────────

    applyFilters(): void {
        let r = [...this.items];
        if (this.statusFilter === 'active')   r = r.filter(x => !!x.active || !!x.Active);
        if (this.statusFilter === 'inactive') r = r.filter(x => !(x.active ?? x.Active));
        if (this.searchTerm.trim()) {
            const q = this.searchTerm.toLowerCase();
            const sf = this.config.searchFields || ['title'];
            r = r.filter(x => sf.some(f => String(x[f] ?? '').toLowerCase().includes(q)));
        }
        this.filtered = r;
    }

    // ── Form ─────────────────────────────────────────────────────────

    initForm(item?: any): void {
        const group: any = {};
        this.config.fields.forEach(f => {
            const validators = f.required ? [Validators.required] : [];
            if (f.type === 'number') {
                if (f.min != null) validators.push(Validators.min(f.min));
                if (f.max != null) validators.push(Validators.max(f.max));
            }
            if (f.type === 'email') validators.push(Validators.email);
            const val = item ? (item[f.key] ?? item[this.toCamel(f.key)] ?? f.default ?? this.emptyVal(f)) : (f.default ?? this.emptyVal(f));
            group[f.key] = [val, validators];
        });
        this.form = this.fb.group(group);
    }

    private emptyVal(f: CrudField): any {
        if (f.type === 'boolean') return false;
        if (f.type === 'number')  return 0;
        return '';
    }

    get fc() { return this.form.controls; }

    openAdd(): void {
        this.editingId = null;
        this.submitted = false;
        this.saveError = '';
        this.initForm();
        this.showForm = true;
    }

    openEdit(item: any): void {
        this.editingId = this.getItemId(item);
        this.submitted = false;
        this.saveError = '';
        this.initForm(item);
        this.showForm = true;
    }

    cancel(): void {
        this.showForm  = false;
        this.submitted = false;
        this.saveError = '';
    }

    save(): void {
        this.submitted = true;
        if (this.form.invalid) return;
        this.saving    = true;
        this.saveError = '';

        const payload = { ...this.form.value };

        const done = () => {
            this.saving = false;
            this.showForm = false;
            this.saveOk = this.editingId ? '✅ Mis à jour.' : '✅ Créé.';
            setTimeout(() => this.saveOk = '', 2500);
            this.load();
        };
        const fail = (err: any) => {
            this.saving = false;
            this.saveError = err?.error?.message || 'Erreur lors de l\'enregistrement.';
        };

        if (this.editingId != null) {
            this.catalogAdmin.adminUpdate(this.config.apiPath, this.editingId, payload).subscribe({ next: done, error: fail });
        } else {
            this.catalogAdmin.adminCreate(this.config.apiPath, payload).subscribe({ next: done, error: fail });
        }
    }

    toggleActive(item: any): void {
        const id = this.getItemId(item);
        const payload = { ...item, active: !(item.active ?? item.Active) };
        this.catalogAdmin.adminUpdate(this.config.apiPath, id, payload).subscribe({
            next: () => { item.active = !item.active; item.Active = item.active; this.applyFilters(); }
        });
    }

    remove(item: any): void {
        const id = this.getItemId(item);
        if (!confirm(`Supprimer "${item.title ?? item.Title ?? id}" ?`)) return;
        this.catalogAdmin.adminDelete(this.config.apiPath, id).subscribe({
            next: () => { this.items = this.items.filter(x => this.getItemId(x) !== id); this.applyFilters(); }
        });
    }

    // ── Display helpers ──────────────────────────────────────────────

    get activeCount()   { return this.items.filter(x => x.active ?? x.Active).length; }
    get inactiveCount() { return this.items.filter(x => !(x.active ?? x.Active)).length; }

    formatCell(item: any, col: any): string {
        const v = item[col.key] ?? item[this.toCamel(col.key)] ?? item[this.toPascal(col.key)];
        if (v == null || v === '') return '—';
        if (col.type === 'boolean') return v ? 'Oui' : 'Non';
        if (col.type === 'date') {
            const d = new Date(v);
            return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('fr-FR');
        }
        return String(v);
    }
}
