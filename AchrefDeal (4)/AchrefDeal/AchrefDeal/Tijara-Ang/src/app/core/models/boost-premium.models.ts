export interface BoostPack {
  id: number;
  title: string;
  price: number;
  discount: number;
  maxDuration: number;
  sliders: boolean;
  sideBar: boolean;
  footer: boolean;
  relatedPost: boolean;
  firstLogin: boolean;
  links: boolean;
  active: boolean;
}

export interface BoostStatus {
  isBoosted: boolean;
  boost: {
    id: number;
    startDate: string;
    endDate: string;
    active: boolean;
    pack: BoostPack | null;
  } | null;
}

export interface PremiumPlan {
  id: number;
  name: string;
  slug: string;
  durationMonths: number;
  price: number;
  currency: string;
  active: boolean;
}

export interface PremiumSubscription {
  id: number;
  idUser: number;
  idPremiumPlan: number;
  idPayment: number;
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  paymentStatus: 'pending' | 'paid';
  cancelledAt: string | null;
  plan?: PremiumPlan;
}

export interface PremiumStatus {
  idUser: number;
  isPremium: boolean;
  premiumStartedAt: string | null;
  premiumExpiry: string | null;
  subscription: PremiumSubscription | null;
}