export type ProductCondition = 'new' | 'uk-used';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  condition: ProductCondition;
  price: number;
  oldPrice?: number | null;
  discountPercent?: number | null;
  stock: number;
  description: string;
  specs?: ProductSpec[];
  images: string[];
  featured: boolean;
  flashSale: boolean;
  published: boolean;
  tags?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  order: number;
  active: boolean;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'customer' | 'admin';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  qty: number;
}

export type DeliveryRegion = 'ibadan' | 'southwest' | 'eastern' | 'northern';
export type DeliveryMethod = 'door-step' | 'same-day' | 'park-pickup';
export type PaymentMethod = 'bank-transfer' | 'klump' | 'bnpl' | 'save-to-buy';
export type PaymentStatus = 'pending' | 'awaiting_verification' | 'verified' | 'rejected' | 'failed';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  slug?: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  region: DeliveryRegion;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  receiptUrl?: string;
  senderAccountName?: string;
  senderBankName?: string;
  paymentReference?: string;
  adminNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SaveToBuyFrequency = 'weekly' | 'monthly';
export type SaveToBuyStatus = 'active' | 'completed' | 'cancelled';

export interface SaveToBuyPlan {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string;
  targetAmount: number;
  amountSaved: number;
  frequency: SaveToBuyFrequency;
  durationMonths: number;
  totalPayments: number;
  installmentAmount: number;
  paymentsCompleted: number;
  sourceAccountName?: string;
  sourceBankName?: string;
  status: SaveToBuyStatus;
  eligibleForDelivery: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SaveToBuyInstallment {
  id: string;
  planId: string;
  userId: string;
  amount: number;
  senderAccountName?: string;
  senderBankName?: string;
  reference?: string;
  receiptUrl?: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  adminNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  orderId?: string;
  planId?: string;
  type: 'bank-transfer' | 'save-to-buy' | 'bnpl';
  provider: string;
  amount: number;
  reference?: string;
  senderAccountName?: string;
  senderBankName?: string;
  receiptUrl?: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  adminNote?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface StoreLocation {
  name: string;
  address: string;
  phone: string;
  hours?: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  rating: number;
}

export interface BankAccountInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
}

export interface BnplSettings {
  activeProvider: 'none' | 'klump' | 'custom';
  providerLabel: string;
  publicKey: string;
  checkoutUrl: string;
  klumpShutDownNotice: string;
  termsText: string;
}

export interface CloudinarySettings {
  cloudName: string;
  uploadPreset: string;
}

export interface LegalDocument {
  title: string;
  content: string;
  awaitingOriginalContent: boolean;
  lastUpdatedLabel: string;
}

export interface DeliveryTier {
  region: DeliveryRegion;
  regionLabel: string;
  options: {
    method: DeliveryMethod;
    label: string;
    fee: number;
    eta: string;
  }[];
  freeThreshold?: number;
}

export interface StorefrontSettings {
  heroEyebrow: string;
  heroTitleStart: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  whatsappUrl: string;
  whatsappLabel: string;
  instagramUrl: string;
  facebookUrl: string;
  googleReviewUrl: string;
  googleReview2Url: string;
  googleReview3Url: string;
  jijiReviewUrl: string;
  businessHours: string;
  stats: {
    physicalStores: number;
    devicesInStock: number;
    warrantyYears: number;
    testedPercent: number;
  };
  brandsMarquee: string[];
  deliveryNotice: string;
  saveToBuyTermsSummary: string;
}

export interface SiteSettingsBundle {
  storefront: StorefrontSettings;
  bankTransferAccount: BankAccountInfo;
  saveToBuyAccount: BankAccountInfo;
  bnpl: BnplSettings;
  cloudinary: CloudinarySettings;
  stores: StoreLocation[];
  faqs: FaqItem[];
  testimonials: TestimonialItem[];
  deliveryTiers: DeliveryTier[];
  termsDocument: LegalDocument;
  privacyDocument: LegalDocument;
}
