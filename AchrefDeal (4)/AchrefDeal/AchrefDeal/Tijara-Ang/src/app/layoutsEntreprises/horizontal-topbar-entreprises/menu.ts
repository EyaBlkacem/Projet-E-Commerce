import { MenuItem } from './menu.model';

export const MENU: MenuItem[] = [

  // -----------------------------------------------------------------------
  // ?? TABLEAU DE BORD
  // -----------------------------------------------------------------------
  {
    id: 2,
    label: 'Tableau de bord',
    icon: 'ri-dashboard-2-line',
    link: '/ent/dashboard',
  },

  // -----------------------------------------------------------------------
  // ACHETER SUR TIJARA (B2B)
  // -----------------------------------------------------------------------
  {
    id: 5,
    label: 'Acheter sur Tijara',
    icon: 'ri-shopping-cart-2-line',
    link: '/shop',
  },

  // -----------------------------------------------------------------------
  // ?? CATALOGUE (dropdown)
  // -----------------------------------------------------------------------
  {
    id: 10,
    label: 'Catalogue',
    icon: 'ri-shopping-bag-3-line',
    subItems: [
      { id: 111, label: 'Tous mes produits',  icon: 'ri-list-check-2',     link: '/ent/products',             parentId: 10 },
      { id: 112, label: 'Ajouter un produit', icon: 'ri-add-circle-line',  link: '/ent/products?action=add',  parentId: 10 },
      { id: 121, label: 'Mes annonces',       icon: 'ri-article-line',     link: '/ent/annonces',             parentId: 10 },
      { id: 122, label: 'Deals & promos',     icon: 'ri-flashlight-line',  link: '/ent/deals',                parentId: 10 },
      { id: 31,  label: 'Packs Boost',        icon: 'ri-rocket-2-line',    link: '/ent/boost-packs',          parentId: 10,
        badge: { variant: 'bg-danger-subtle text-danger', text: 'NEW' } },
    ],
  },

  // -----------------------------------------------------------------------
  // ?? VENTES (dropdown)
  // -----------------------------------------------------------------------
  {
    id: 20,
    label: 'Ventes',
    icon: 'ri-file-list-3-line',
    subItems: [
      { id: 21, label: 'Commandes',   icon: 'ri-file-list-3-line', link: '/ent/orders',      parentId: 20 },
      { id: 22, label: 'Livraisons',  icon: 'ri-truck-line',       link: '/ent/deliveries',  parentId: 20 },
      { id: 23, label: 'Facturation', icon: 'ri-file-text-line',   link: '/ent/invoices',    parentId: 20 },
    ],
  },

  // -----------------------------------------------------------------------
  // ?? COMMUNAUTÃ‰ (dropdown)
  // -----------------------------------------------------------------------
  {
    id: 40,
    label: 'Communaute',
    icon: 'ri-chat-3-line',
    subItems: [
      { id: 41, label: 'Messagerie',   icon: 'ri-chat-3-line',              link: '/ent/messages',      parentId: 40 },
      { id: 42, label: 'Mes abonnes',  icon: 'ri-user-heart-line',          link: '/ent/followers',     parentId: 40 },
      { id: 52, label: 'Reclamations', icon: 'ri-customer-service-2-line',  link: '/ent/reclamations',  parentId: 40 },
    ],
  },

  // -----------------------------------------------------------------------
  // ?? PREMIUM (top-level)
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // ?? MON COMPTE
  // -----------------------------------------------------------------------
  {
    id: 51,
    label: 'Profil boutique',
    icon: 'ri-store-2-line',
    link: '/ent/profile',
  },
   {
    id: 53,
    label: 'Mon portefeuille',
    icon: 'ri-wallet-3-line',
    link: '/ent/wallet',
  },
];


