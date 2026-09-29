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
    link: '/users/dashboard',
  },

  // ─── BOUTIQUE ─────────────────────────────────────────────────────────────
  {
    id: 10,
    label: 'MENUITEMS.SHOP.TEXT',
    isTitle: true
  },
  {
    id: 11,
    label: 'MENUITEMS.PRODUCTS.TEXT',
    icon: 'ri-shopping-bag-3-line',
    link: '/shop/products',
  },
  {
    id: 12,
    label: 'MENUITEMS.CART.TEXT',
    icon: 'ri-shopping-cart-line',
    link: '/shop/cart',
  },

  // ─── MES COMMANDES ────────────────────────────────────────────────────────
  {
    id: 20,
    label: 'MENUITEMS.ORDERS_SECTION.TEXT',
    isTitle: true
  },
  {
    id: 21,
    label: 'MENUITEMS.ORDERS.TEXT',
    icon: 'ri-file-list-3-line',
    link: '/users/orders',
  },

  // ─── COMMUNAUTÉ ───────────────────────────────────────────────────────────
  {
    id: 25,
    label: 'MENUITEMS.COMMUNITY.TEXT',
    isTitle: true
  },
  {
    id: 26,
    label: 'Annonces',
    icon: 'ri-megaphone-line',
    link: '/users/annonces',
  },

  // ─── MON COMPTE ───────────────────────────────────────────────────────────
  {
    id: 30,
    label: 'MENUITEMS.ACCOUNT.TEXT',
    isTitle: true
  },
  {
    id: 31,
    label: 'MENUITEMS.PROFILE.TEXT',
    icon: 'ri-user-line',
    link: '/users/profile',
  },
  {
  id: 34,
  label: 'Mon portefeuille',
  icon: 'ri-wallet-3-line',
  link: '/users/my-wallet',
},

{
  id: 35,
  label: 'Vérification de compte',
  icon: 'ri-shield-check-line',
  link: '/users/verification',
},
  {
    id: 32,
    label: 'MENUITEMS.RECLAMATIONS.TEXT',
    icon: 'ri-customer-service-2-line',
    link: '/users/reclamations',
  },
  {
    id: 33,
    label: 'Premium',
    icon: 'ri-vip-crown-2-line',
    link: '/users/premium',
  },
];
