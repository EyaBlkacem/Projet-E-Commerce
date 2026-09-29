import { Injectable } from '@angular/core';

export interface CartItem {
  product: any;
  qty: number;
}

/** Panier front-end partagé, conservé localement par utilisateur. */
@Injectable({ providedIn: 'root' })
export class CartService {
  private get cartKey(): string {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      // Le backend identifie l'utilisateur via IdUser (PascalCase, cf.
      // modèle Users / Orders.IdUser), pas `id`. Même logique de
      // résolution d'id que dans cart.component.ts.
      const id = u?.id ?? u?.IdUser ?? u?.user?.id ?? u?.user?.IdUser;
      return id ? `tijara_cart_${id}` : 'tijara_cart_guest';
    } catch {
      return 'tijara_cart_guest';
    }
  }

  add(product: any, quantity = 1): void {
    if (!product?.id) return;

    const item = {
      id: product.id,
      name: product.name ?? product.title ?? 'Produit',
      image: product.image ?? null,
      price: Number(product.price ?? 0),
      vendor: product.vendor ?? product.seller ?? '',
      // ⚠️ AJOUTÉ : sans ça, un produit ajouté via ce service perdait son
      // identifiant vendeur, et le groupement par colis (cart.component)
      // retombait sur le nom affiché du vendeur au lieu de son vendor_id -
      // moins fiable si deux vendeurs partagent un jour le même nom.
      vendor_id: product.vendor_id ?? product.IdUser ?? null,
      stock: product.stock ?? 999,
    };
    const cart = this.getItems();
    const existing = cart.find(entry => String(entry.product.id) === String(item.id));

    if (existing) existing.qty += quantity;
    else cart.push({ product: item, qty: quantity });

    localStorage.setItem(this.cartKey, JSON.stringify(cart));
    window.dispatchEvent(new Event('tijara-cart-updated'));
  }

  getItems(): CartItem[] {
    try {
      const saved = localStorage.getItem(this.cartKey);
      const cart = saved ? JSON.parse(saved) : [];
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }
}