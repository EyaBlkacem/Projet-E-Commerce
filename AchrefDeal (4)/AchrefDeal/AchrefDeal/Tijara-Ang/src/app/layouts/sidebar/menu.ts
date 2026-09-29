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
    link: '/admin/dashboard',
  },

  // ─── SECTION : CATALOGUE ─────────────────────────────────────────────────
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
        link: '/admin/products',
        parentId: 11
      },
      {
        id: 13,
        label: 'MENUITEMS.PRODUCTS.LIST.ADD',
        link: '/admin/products/add',
        parentId: 11
      }
    ]
  },
  {
    id: 14,
    label: 'MENUITEMS.CATEGORIES.TEXT',
    icon: 'ri-list-check-2',
    isCollapsed: true,
    subItems: [
      {
        id: 15,
        label: 'MENUITEMS.CATEGORIES.LIST.ALL',
        link: '/admin/categories',
        parentId: 14
      },
      {
        id: 16,
        label: 'MENUITEMS.CATEGORIES.LIST.ADD',
        link: '/admin/categories/add',
        parentId: 14
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
        link: '/admin/orders',
        parentId: 21
      },
      {
        id: 23,
        label: 'MENUITEMS.ORDERS.LIST.PENDING',
        link: '/admin/orders/pending',
        parentId: 21
      },
      {
        id: 24,
        label: 'MENUITEMS.ORDERS.LIST.DELIVERED',
        link: '/admin/orders/delivered',
        parentId: 21
      }
    ]
  },

  // ─── SECTION : UTILISATEURS ──────────────────────────────────────────────
  {
    id: 30,
    label: 'MENUITEMS.USERS_SECTION.TEXT',
    isTitle: true
  },
  {
    id: 31,
    label: 'MENUITEMS.USERS.TEXT',
    icon: 'ri-group-line',
    isCollapsed: true,
    subItems: [
      {
        id: 32,
        label: 'MENUITEMS.USERS.LIST.ALL',
        link: '/admin/users',
        parentId: 31
      },
      {
        id: 33,
        label: 'MENUITEMS.USERS.LIST.ADD',
        link: '/admin/users/add',
        
        parentId: 31
      },
   
    ]
  },
  {
    id: 34,
    label: 'MENUITEMS.VENDORS.TEXT',
    icon: 'ri-store-2-line',
    link: '/admin/vendors',
  },

  // ─── SECTION : GÉOGRAPHIE ────────────────────────────────────────────────
  {
    id: 40,
    label: 'MENUITEMS.GEO.TEXT',
    isTitle: true
  },
  {
    id: 41,
    label: 'MENUITEMS.COUNTRIES.TEXT',
    icon: 'ri-map-pin-line',
    link: '/admin/countries',
  },
  {
    id: 42,
    label: 'MENUITEMS.CITIES.TEXT',
    icon: 'ri-building-line',
    link: '/admin/cities',
  },

  // ─── SECTION : SUPPORT ───────────────────────────────────────────────────
  {
    id: 50,
    label: 'MENUITEMS.SUPPORT.TEXT',
    isTitle: true
  },
  {
    id: 51,
    label: 'MENUITEMS.RECLAMATIONS.TEXT',
    icon: 'ri-customer-service-2-line',
    link: '/admin/reclamations',
  },
  {
    id: 52,
    label: 'MENUITEMS.CAUSES.TEXT',
    icon: 'ri-error-warning-line',
    link: '/admin/causes',
  },
];
