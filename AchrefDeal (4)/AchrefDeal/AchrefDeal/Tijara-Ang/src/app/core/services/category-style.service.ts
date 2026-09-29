import { Injectable } from '@angular/core';

export interface CategoryStyle {
  match: string[];
  label: string;
  icon: string;
  color: string;
}

/**
 * Source unique de résolution/style des catégories, utilisée par tous les
 * composants admin (annonces, produits, transports, pages détail...).
 *
 * Avant : chaque composant réimplémentait sa propre version de
 * normalize()/resolveCategoryRaw()/canonicalCategoryLabel(), avec des
 * divergences silencieuses (ex: une page vérifiait moins de noms de champs
 * qu'une autre → catégorie affichée vide "—" à un endroit, correcte ailleurs,
 * pour la même donnée backend).
 */
@Injectable({ providedIn: 'root' })
export class CategoryStyleService {

  private readonly styles: CategoryStyle[] = [
    { match: ['electronique', 'electronics', 'smartphone', 'high-tech', 'hightech'], label: 'Électronique',     icon: 'ri-smartphone-line',  color: '#405189' },
    { match: ['vetement', 'vetements', 'mode', 'fashion'],                            label: 'Vêtements',        icon: 'ri-t-shirt-line',     color: '#e91e63' },
    { match: ['maison', 'jardin', 'deco', 'meuble', 'meubles', 'ameublement'],         label: 'Maison & Jardin',  icon: 'ri-home-3-line',      color: '#ff9800' },
    { match: ['sport', 'sports', 'loisir', 'loisirs'],                                 label: 'Sports & Loisirs', icon: 'ri-run-line',         color: '#4caf50' },
    { match: ['beaute', 'sante', 'beauty', 'health', 'cosmetique'],                    label: 'Beauté & Santé',   icon: 'ri-heart-line',       color: '#9c27b0' },
    { match: ['alimentation', 'food', 'epicerie'],                                     label: 'Alimentation',     icon: 'ri-restaurant-line',  color: '#f44336' },
    { match: ['vehicule', 'vehicules', 'voiture', 'voitures', 'auto'],                 label: 'Véhicules',        icon: 'ri-car-line',         color: '#607d8b' },
    { match: ['immobilier', 'immeuble', 'appartement'],                                label: 'Immobilier',       icon: 'ri-building-line',    color: '#795548' },
    { match: ['livre', 'livres', 'media', 'medias', 'book'],                           label: 'Livres & Médias',  icon: 'ri-book-line',        color: '#00bcd4' },
    { match: ['service', 'services', 'cours', 'formation'],                            label: 'Services',         icon: 'ri-briefcase-line',   color: '#009688' },
  ];

  private readonly fallback = { icon: 'ri-box-3-line', color: '#6c757d' };

  normalize(s: string): string {
    return (s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // enlève les accents
      .toLowerCase().trim();
  }

  /** Essaie tous les noms de champs possibles côté API pour la catégorie
   *  (objet complet ou déjà une chaîne). Une seule liste, partagée partout. */
  resolveRaw(p: any): string {
    const candidate =
      p?.category ?? p?.category_name ?? p?.categoryName ??
      p?.sub_category ?? p?.subCategory ?? p?.type ?? p?.rubrique ?? '';
    if (typeof candidate === 'string') return candidate;
    return candidate?.name ?? candidate?.title ?? '';
  }

  /** Libellé canonique si la valeur brute matche une entrée connue,
   *  sinon garde le texte brut renvoyé par l'API (au lieu de l'effacer). */
  canonicalLabel(rawCategory: string): string {
    const key = this.normalize(rawCategory);
    if (!key) return '';
    const found = this.styles.find(s => s.match.some(m => key.includes(m)));
    return found ? found.label : rawCategory.trim();
  }

  /** Résout directement à partir de l'objet brut de l'API → libellé final affichable. */
  labelFor(p: any): string {
    return this.canonicalLabel(this.resolveRaw(p));
  }

  color(cat: string): string {
    const key = this.normalize(cat);
    if (!key) return this.fallback.color;
    const found = this.styles.find(s => s.match.some(m => key.includes(m)) || this.normalize(s.label) === key);
    return found ? found.color : this.fallback.color;
  }

  bg(cat: string): string {
    return this.color(cat) + '18';
  }

  icon(cat: string): string {
    const key = this.normalize(cat);
    if (!key) return this.fallback.icon;
    const found = this.styles.find(s => s.match.some(m => key.includes(m)) || this.normalize(s.label) === key);
    return found ? found.icon : this.fallback.icon;
  }
}
