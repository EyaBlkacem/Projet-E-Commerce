import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [
  {
    id: 11,
    label: 'Annonces',
    icon: 'ri-megaphone-line',
    subItems: [
      { id: 111, label: 'Toutes les annonces',   icon: 'ri-list-check-2', link: '/landing/annonces', parentId: 11 },
      { id: 113, label: 'Ma wishlist annonces',  icon: 'ri-heart-line',   link: '/users/wishlist',    parentId: 11 },
    ],
  },
  {
    id: 12,
    label: 'Produits',
    icon: 'ri-shopping-bag-3-line',
    subItems: [
      { id: 121, label: 'Tous les produits', icon: 'ri-list-check-2', link: '/landing/produits', parentId: 12 },
      { id: 123, label: 'Wishlist produits', icon: 'ri-heart-line',   link: '/users/wishlist',    parentId: 12 },
    ],
  },
  {
    id: 13,
    label: 'Deals',
    icon: 'ri-flashlight-line',
    link: '/landing/deals',
  },
  {
    id: 14,
    label: 'Commandes',
    icon: 'ri-file-list-3-line',
    link: '/users/orders',
  },
  {
    id: 15,
    label: 'Mes annonces',
    icon: 'ri-store-2-line',
    link: '/users/my-products',
  },
];



