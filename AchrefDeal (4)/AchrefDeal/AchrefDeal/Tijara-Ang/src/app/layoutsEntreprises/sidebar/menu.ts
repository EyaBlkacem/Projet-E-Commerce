import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  // ─── SECTION : GÉNÉRAL ───────────────────────────────────────────────────
  {
    id: 1,
    label: 'MENUITEMS.GENERAL.TEXT',
    isTitle: true
  },
  {
    id: 2,
    label: 'MENUITEMS.DASHBOARD.TEXT',
    icon: 'ri-dashboard-2-line',
    link: '/ent/dashboard',
  },

  // ─── SECTION : MES PRODUITS ──────────────────────────────────────────────
  {
    id: 10,
    label: 'MENUITEMS.CATALOGUE.TEXT',
    isTitle: true
  },
  {
    id: 11,
    label: 'MENUITEMS.PRODUCTS.TEXT',
    icon: 'ri-shopping-bag-3-line',
    isCollapsed: true,
    subItems: [
      {
        id: 12,
        label: 'MENUITEMS.PRODUCTS.LIST.ALL',
        link: '/ent/products',
        parentId: 11
      },
      {
        id: 13,
        label: 'MENUITEMS.PRODUCTS.LIST.ADD',
        link: '/ent/products/add',
        parentId: 11
      }
    ]
  },

  // ─── SECTION : COMMANDES ─────────────────────────────────────────────────
  {
    id: 20,
    label: 'MENUITEMS.ORDERS_SECTION.TEXT',
    isTitle: true
  },
  {
    id: 21,
    label: 'MENUITEMS.ORDERS.TEXT',
    icon: 'ri-file-list-3-line',
    isCollapsed: true,
    subItems: [
      {
        id: 22,
        label: 'MENUITEMS.ORDERS.LIST.ALL',
        link: '/ent/orders',
        parentId: 21
      },
      {
        id: 23,
        label: 'MENUITEMS.ORDERS.LIST.PENDING',
        link: '/ent/orders/pending',
        parentId: 21
      },
      {
        id: 24,
        label: 'MENUITEMS.ORDERS.LIST.DELIVERED',
        link: '/ent/orders/delivered',
        parentId: 21
      }
    ]
  },

  // ─── SECTION : ANNONCES & DEALS ─────────────────────────────────────────
  {
    id: 35,
    label: 'MENUITEMS.ANNONCES.TEXT',
    isTitle: true
  },
  {
    id: 36,
    label: 'Annonces',
    icon: 'ri-megaphone-line',
    link: '/ent/annonces',
  },
  {
    id: 37,
    label: 'Deals & Promos',
    icon: 'ri-price-tag-3-line',
    link: '/ent/deals',
  },

  // ─── SECTION : STATISTIQUES ──────────────────────────────────────────────
  {
    id: 30,
    label: 'MENUITEMS.STATS.TEXT',
    isTitle: true
  },
  {
    id: 31,
    label: 'MENUITEMS.ANALYTICS.TEXT',
    icon: 'ri-bar-chart-line',
    link: '/ent/analytics',
  },

  // ─── SECTION : MON COMPTE ────────────────────────────────────────────────
  {
    id: 40,
    label: 'MENUITEMS.MY_ACCOUNT.TEXT',
    isTitle: true
  },
  {
    id: 41,
    label: 'MENUITEMS.PROFILE.TEXT',
    icon: 'ri-store-2-line',
    link: '/ent/profile',
  },
  {
    id: 43,
    label: 'Mon portefeuille',
    icon: 'ri-wallet-3-line',
    link: '/ent/wallet',
  },
 
{
  id: 44,
  label: 'Vérification de compte',
  icon: 'ri-shield-check-line',
  link: '/ent/verification',
  
},
  {
    id: 42,
    label: 'MENUITEMS.RECLAMATIONS.TEXT',
    icon: 'ri-customer-service-2-line',
    link: '/ent/reclamations',
  },
];
