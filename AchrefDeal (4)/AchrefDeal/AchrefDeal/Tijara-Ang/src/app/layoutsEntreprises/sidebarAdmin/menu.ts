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
    link: '/ent/dashboard',
  },

  // ─── MA BOUTIQUE ─────────────────────────────────────────────────────────
  {
    id: 10,
    label: 'MENUITEMS.SHOP.TEXT',
    isTitle: true
  },
  {
    id: 11,
    label: 'MENUITEMS.PRODUCTS.TEXT',
    icon: 'ri-box-3-line',
    link: '/ent/products',
  },
  {
    id: 12,
    label: 'MENUITEMS.ORDERS.TEXT',
    icon: 'ri-file-list-3-line',
    link: '/ent/orders',
  },
  {
    id: 13,
    label: 'MENUITEMS.CHAT.TEXT',
    icon: 'ri-chat-3-line',
    link: '/ent/messages',
  },

  // ─── MON COMPTE ──────────────────────────────────────────────────────────
  {
    id: 20,
    label: 'MENUITEMS.ACCOUNT.TEXT',
    isTitle: true
  },
  {
    id: 21,
    label: 'MENUITEMS.PROFILE.TEXT',
    icon: 'ri-user-line',
    link: '/ent/profile',
  },
  {
    id: 22,
    label: 'MENUITEMS.RECLAMATIONS.TEXT',
    icon: 'ri-customer-service-2-line',
    link: '/ent/reclamations',
  },
];
