import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TijaraApiService } from 'src/app/core/services/tijara-api.service';
import { SettingsService } from 'src/app/core/services/settings.service';

interface PointPacket {
    id_packet?:   number;
    idPacket?:    number;
    title:        string;
    description?: string;
    points_count?: number;
    pointsCount?: number;
    price:        number;
    discount:     number;
    active:       boolean;
}

@Component({
    selector: 'app-settings-admin',
    templateUrl: './settings-admin.component.html',
    styleUrls: ['./settings-admin.component.scss'],
    standalone: false
})
export class SettingsAdminComponent implements OnInit {

    breadCrumbItems = [
        { label: 'Admin' },
        { label: 'Paramètres', active: true }
    ];

    form!: FormGroup;
    loading   = true;
    saving    = false;
    saveError = '';
    saveOk    = '';

   
    realSettings: { key: string; value: string; updatedAt: string | null }[] = [];
    realSettingsLoading = true;
    editingKey: string | null = null;
    editValue = '';
    newKey = '';
    newValue = '';
    showAddSetting = false;

    // Point packets CRUD
    packets: PointPacket[] = [];
    packetsLoading = true;
    packetForm!: FormGroup;
    showPacketForm = false;
    editingPacketId: number | null = null;
    packetSubmitted = false;
    packetSaving    = false;
    packetError     = '';

    constructor(private fb: FormBuilder, private api: TijaraApiService, private settings: SettingsService) {}

    ngOnInit(): void {
        this.initForm();
        this.initPacketForm();
        this.loadRealSettings();
        this.loadPackets();
    }

    // ── Vrais paramètres (clé/valeur) ──────────────────────────────────
    loadRealSettings(): void {
        this.realSettingsLoading = true;
        this.settings.getAdminSettings().subscribe({
            next: (res: any) => {
                const rows: any[] = res?.data || [];
                this.realSettings = rows.map((r: any) => ({
                    key: r.Key, value: r.Value, updatedAt: r.UpdatedAt || null,
                }));
                this.realSettingsLoading = false;
                this.loading = false; // la maquette ci-dessous ne charge plus rien de réel
            },
            error: () => { this.realSettingsLoading = false; this.loading = false; }
        });
    }

    startEditSetting(row: { key: string; value: string }): void {
        this.editingKey = row.key;
        this.editValue  = row.value;
    }
    cancelEditSetting(): void { this.editingKey = null; }

    saveEditSetting(row: { key: string; value: string; updatedAt: string | null }): void {
        this.settings.updateAdminSetting(row.key, this.editValue).subscribe({
            next: () => { row.value = this.editValue; this.editingKey = null; },
            error: () => alert('Enregistrement impossible.'),
        });
    }

    addSetting(): void {
        if (!this.newKey.trim()) return;
        this.settings.createAdminSetting(this.newKey.trim(), this.newValue).subscribe({
            next: () => {
                this.realSettings.push({ key: this.newKey.trim(), value: this.newValue, updatedAt: null });
                this.newKey = ''; this.newValue = ''; this.showAddSetting = false;
            },
            error: () => alert("Création impossible (la clé existe peut-être déjà)."),
        });
    }

    deleteSetting(row: { key: string }): void {
        if (!confirm(`Supprimer le paramètre "${row.key}" ?`)) return;
        this.settings.deleteAdminSetting(row.key).subscribe({
            next: () => { this.realSettings = this.realSettings.filter(r => r.key !== row.key); },
            error: () => alert('Suppression impossible.'),
        });
    }

    // ── Formulaire paramètres ─────────────────────────────────────────

    private initForm(): void {
        this.form = this.fb.group({
            // Financier
            money_transfer_commission_pct:      [0, [Validators.required, Validators.min(0), Validators.max(100)]],
            standard_purchase_commission_pct:   [0, [Validators.required, Validators.min(0), Validators.max(100)]],
            // Abonnements
            account_pro_user_month_price:       [0,  [Validators.required, Validators.min(0)]],
            account_pro_entreprise_month_price: [0,  [Validators.required, Validators.min(0)]],
            min_subscription_months:            [1,  [Validators.required, Validators.min(1), Validators.max(12)]],
            // Durées annonces
            max_jobs_duration_days:             [30, [Validators.required, Validators.min(1), Validators.max(366)]],
            max_missions_duration_days:         [30, [Validators.required, Validators.min(1), Validators.max(366)]],
            max_freelance_duration_days:        [30, [Validators.required, Validators.min(1), Validators.max(366)]],
            // Limites standard
            standard_max_magasin:               [1,   [Validators.required, Validators.min(0)]],
            standard_max_points:                [100, [Validators.required, Validators.min(0)]],
            min_add_annonce_points:             [5,   [Validators.required, Validators.min(0)]],
            min_add_freelance_points:           [5,   [Validators.required, Validators.min(0)]],
            min_add_products_points:            [5,   [Validators.required, Validators.min(0)]],
            // Toggles fonctionnalités
            mode_magasin_deals_active:          [true],
            boost_ads_enabled:                  [true],
            upgrade_account_enabled:            [true],
            buy_points_enabled:                 [true],
            premium_account_enabled:            [true],
            rating_preview_standard_enabled:    [true],
            rating_preview_enabled:             [true],
            // Coupons
            boost_ads_coupon_enabled:           [false],
            boost_ads_coupon_price:             [0, [Validators.min(0)]],
            freelance_coupon_enabled:           [false],
            freelance_coupon_price:             [0, [Validators.min(0)]],
        });
    }

    get f() { return this.form.controls; }

    save(): void {
        this.saveError = "Ce formulaire n'est pas encore connecté : ces paramètres n'existent pas côté backend actuellement (voir la liste réelle ci-dessus). À voir avec l'encadrant si ces réglages doivent être ajoutés.";
        this.saveOk = '';
    }

    // ── Packets de points ─────────────────────────────────────────────

    private initPacketForm(pk?: PointPacket): void {
        this.packetForm = this.fb.group({
            title:        [pk?.title        || '',   [Validators.required, Validators.minLength(2)]],
            description:  [pk?.description  || ''],
            points_count: [pk?.points_count ?? pk?.pointsCount ?? 0, [Validators.required, Validators.min(1)]],
            price:        [pk?.price        ?? 0,    [Validators.required, Validators.min(0)]],
            discount:     [pk?.discount     ?? 0,    [Validators.required, Validators.min(0), Validators.max(100)]],
            active:       [pk?.active ?? true],
        });
    }

    get pf() { return this.packetForm.controls; }

    private loadPackets(): void {
        this.packetsLoading = true;
        this.settings.getPointPackets().subscribe({
            next: (res: any) => {
                const rows: any[] = res?.data || [];
                this.packets = rows.map(p => ({
                    id_packet:    p.IdPacket,
                    idPacket:     p.IdPacket,
                    title:        p.Title,
                    description:  p.Description,
                    points_count: p.PointsCount,
                    pointsCount:  p.PointsCount,
                    price:        Number(p.Price    ?? 0),
                    discount:     Number(p.Discount ?? 0),
                    active:       !!p.Active,
                }));
                this.packetsLoading = false;
            },
            error: () => { this.packetsLoading = false; }
        });
    }

    openAddPacket(): void {
        this.editingPacketId = null;
        this.packetSubmitted = false;
        this.packetError     = '';
        this.initPacketForm();
        this.showPacketForm  = true;
    }

    openEditPacket(pk: PointPacket): void {
        this.editingPacketId = (pk.id_packet ?? pk.idPacket) || null;
        this.packetSubmitted = false;
        this.packetError     = '';
        this.initPacketForm(pk);
        this.showPacketForm  = true;
    }

    cancelPacket(): void {
        this.showPacketForm  = false;
        this.packetSubmitted = false;
        this.packetError     = '';
    }

    savePacket(): void {
        this.packetSubmitted = true;
        if (this.packetForm.invalid) return;
        this.packetSaving = true;
        this.packetError  = '';

        const v = this.packetForm.value;
        const payload = {
            Title:       v.title,
            Description: v.description,
            PointsCount: Number(v.points_count),
            Price:       Number(v.price),
            Discount:    Number(v.discount),
            Active:      !!v.active,
        };

        const done = () => { this.packetSaving = false; this.showPacketForm = false; this.loadPackets(); };
        const fail = (err: any) => {
            this.packetSaving = false;
            this.packetError  = err?.error?.message || 'Erreur lors de l\'enregistrement du packet.';
        };

        if (this.editingPacketId) {
            this.settings.updatePointPacket(this.editingPacketId, payload).subscribe({ next: done, error: fail });
        } else {
            this.settings.createPointPacket(payload).subscribe({ next: done, error: fail });
        }
    }

    deletePacket(pk: PointPacket): void {
        const id = pk.id_packet ?? pk.idPacket;
        if (!id) return;
        if (!confirm(`Supprimer le packet "${pk.title}" ?`)) return;
        this.settings.deletePointPacket(id).subscribe({
            next: () => { this.packets = this.packets.filter(p => (p.id_packet ?? p.idPacket) !== id); }
        });
    }
}