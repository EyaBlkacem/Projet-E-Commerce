import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [

  // ─── GÉNÉRAL ─────────────────────────────────────────────────────────────
  {
    id: 1,
    label: 'MENUITEMS.GENERAL.TEXT',
    isTitle: true
  },
  {
    id: 2,
    label: 'MENUITEMS.DASHBOARD.TEXT',
    icon: 'ri-dashboard-2-line',
    link: '/admin/dashboard',
  },

  // ─── MODÉRATION (priorité 1) ──────────────────────────────────────────────
  {
    id: 10,
    label: 'MENUITEMS.MODERATION.TEXT',
    isTitle: true
  },
  {
    id: 11,
    label: 'Annonces',
    icon: 'ri-megaphone-line',
    link: '/admin/annonces',
  },
  {
    id: 12,
    label: 'Produits',
    icon: 'ri-box-3-line',
    link: '/admin/products',
  },
  {
    id: 13,
    label: 'Deals',
    icon: 'ri-price-tag-3-line',
    link: '/admin/deals',
  },
  {
    id: 14,
    label: 'Gagnants',
    icon: 'ri-trophy-line',
    link: '/admin/winners',
  },

  // ─── MARKETING & PROMOTIONS (priorité 2) ──────────────────────────────────
  {
    id: 20,
    label: 'Marketing',
    isTitle: true
  },
  {
    id: 21,
    label: 'Coupons',
    icon: 'ri-coupon-2-line',
    link: '/admin/coupons',
  },
  {
    id: 22,
    label: 'Prix & cadeaux',
    icon: 'ri-gift-line',
    link: '/admin/prizes',
  },
  {
    id: 23,
    label: 'Packs Boost Ads',
    icon: 'ri-rocket-2-line',
    link: '/admin/boost-packs',
  },

  // ─── LOGISTIQUE & FINANCE (priorité 3) ────────────────────────────────────
  {
    id: 30,
    label: 'Logistique & Finance',
    isTitle: true
  },
  { id: 31, label: 'Transporteurs', icon: 'ri-truck-line',      link: '/admin/transports' },
  { id: 32, label: 'Livraisons',    icon: 'ri-route-line',      link: '/admin/deliveries' },
  { id: 33, label: 'Paiements',     icon: 'ri-bank-card-line',  link: '/admin/payments'   },
  { id: 335, label: 'Wallets',      icon: 'ri-wallet-3-line',   link: '/admin/wallets'    },
  { id: 34, label: 'Factures',      icon: 'ri-file-text-line',  link: '/admin/invoices'   },
  { id: 35, label: 'Rapports',      icon: 'ri-line-chart-line', link: '/admin/reports'    },

  // ─── COMPTES & MONÉTISATION (nouvelles fonctionnalités) ────────────────────
  {
    id: 36,
    label: 'Comptes & Monétisation',
    isTitle: true
  },
  { id: 37, label: 'Vérifications', icon: 'ri-shield-check-line', link: '/admin/verifications' },
  { id: 38, label: 'Premium',       icon: 'ri-vip-crown-2-line',  link: '/admin/premium'       },
  { id: 39, label: 'Boosts',        icon: 'ri-rocket-2-line',     link: '/admin/boosts'        },

  // ─── CATALOGUE (le reste) ─────────────────────────────────────────────────
  {
    id: 40,
    label: 'MENUITEMS.CATALOGUE.TEXT',
    isTitle: true
  },
  {
    id: 41,
    label: 'MENUITEMS.CATEGORIES.TEXT',
    icon: 'ri-list-check-2',
    link: '/admin/categories',
  },
  {
    id: 415,
    label: 'Caractéristiques',
    icon: 'ri-list-settings-line',
    link: '/admin/features',
  },
  {
    id: 42,
    label: 'Marques',
    icon: 'ri-price-tag-3-line',
    link: '/admin/brands',
  },

  // ─── COMMANDES ────────────────────────────────────────────────────────────
  {
    id: 50,
    label: 'MENUITEMS.ORDERS_SECTION.TEXT',
    isTitle: true
  },
  {
    id: 51,
    label: 'MENUITEMS.ORDERS.TEXT',
    icon: 'ri-file-list-3-line',
    link: '/admin/orders',
  },

  // ─── UTILISATEURS ─────────────────────────────────────────────────────────
  {
    id: 60,
    label: 'MENUITEMS.USERS_SECTION.TEXT',
    isTitle: true
  },
  {
    id: 61,
    label: 'MENUITEMS.USERS.TEXT',
    icon: 'ri-group-line',
    link: '/admin/users',
  },
  {
    id: 62,
    label: 'MENUITEMS.VENDORS.TEXT',
    icon: 'ri-store-2-line',
    link: '/admin/vendors',
  },

  // ─── INTELLIGENCE ARTIFICIELLE ────────────────────────────────────────────
  {
    id: 70,
    label: 'Intelligence Artificielle',
    isTitle: true
  },
  {
    id: 71,
    label: 'Dashboard IA',
    icon: 'ri-robot-line',
    link: '/admin/ia',
  },

  // ─── SUPPORT ──────────────────────────────────────────────────────────────
  {
    id: 80,
    label: 'MENUITEMS.SUPPORT.TEXT',
    isTitle: true
  },
  {
    id: 81,
    label: 'MENUITEMS.RECLAMATIONS.TEXT',
    icon: 'ri-customer-service-2-line',
    link: '/admin/reclamations',
  },

  // ─── RÉFÉRENTIEL ──────────────────────────────────────────────────────────
  {
    id: 90,
    label: 'Référentiel',
    isTitle: true
  },
  {
    id: 91,
    label: 'Pays',
    icon: 'ri-flag-2-line',
    link: '/admin/countries',
  },
  {
    id: 92,
    label: 'Villes',
    icon: 'ri-building-line',
    link: '/admin/cities',
  },
  {
    id: 93,
    label: 'Causes de réclamation',
    icon: 'ri-error-warning-line',
    link: '/admin/causes',
  },

  // ─── SÉCURITÉ ─────────────────────────────────────────────────────────────
  { id: 100, label: 'Sécurité', isTitle: true },
  { id: 101, label: 'Permissions', icon: 'ri-shield-keyhole-line', link: '/admin/permissions' },

  // ─── CONFIGURATION ────────────────────────────────────────────────────────
  { id: 110, label: 'Configuration', isTitle: true },
  { id: 111, label: 'Paramètres',    icon: 'ri-settings-3-line',   link: '/admin/settings'    },
];