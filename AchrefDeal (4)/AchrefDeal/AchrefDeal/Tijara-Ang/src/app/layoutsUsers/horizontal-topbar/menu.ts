import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  // ─── BOUTIQUE ─────────────────────────────────────────────────────────────
  {
    id: 1,
    label: 'MENUITEMS.SHOP.TEXT',
    isTitle: true
  },
  {
    id: 2,
    label: 'MENUITEMS.PRODUCTS.TEXT',
    icon: 'ri-store-2-line',
    link: '/shop/products',
  },
  {
    id: 3,
    label: 'MENUITEMS.CART.TEXT',
    icon: 'ri-shopping-cart-line',
    link: '/shop/cart',
  },
  {
    id: 4,
    label: 'MENUITEMS.ORDERS.TEXT',
    icon: 'ri-file-list-3-line',
    link: '/shop/orders',
  },
  {
    id: 5,
    label: 'MENUITEMS.CHAT.TEXT',
    icon: 'ri-chat-3-line',
    link: '/shop/chat',
  },

  // ─── COMMUNAUTÉ ──────────────────────────────────────────────────────────
  {
    id: 8,
    label: 'MENUITEMS.COMMUNITY.TEXT',
    isTitle: true
  },
  {
    id: 9,
    label: 'Annonces',
    icon: 'ri-megaphone-line',
    link: '/users/annonces',
  },

  // ─── MON COMPTE ──────────────────────────────────────────────────────────
  {
    id: 10,
    label: 'MENUITEMS.ACCOUNT.TEXT',
    isTitle: true
  },
  {
    id: 11,
    label: 'MENUITEMS.RECLAMATIONS.TEXT',
    icon: 'ri-customer-service-2-line',
    link: '/users/reclamations',
  },
];
