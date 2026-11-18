import { Category, DeliveryRegion, DeliveryTier, SiteSettingsBundle } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'laptops',
    slug: 'laptops',
    name: 'Laptops',
    description: 'Brand new & UK used business and creator laptops',
    order: 1,
    active: true,
  },
  {
    id: 'phones',
    slug: 'phones',
    name: 'Phones',
    description: 'UK used & brand new iPhones and Android smartphones',
    order: 2,
    active: true,
  },
  {
    id: 'gadgets',
    slug: 'gadgets',
    name: 'Gadgets',
    description: 'Monitors, storage drives, headsets, chargers & accessories',
    order: 3,
    active: true,
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettingsBundle = {
  storefront: {
    heroEyebrow: 'Nationwide Delivery · Warranty on Every Device',
    heroTitleStart: 'A strong signal for your next ',
    heroTitleHighlight: 'device',
    heroSubtitle:
      'New & UK used laptops, phones and gadgets — tested, warrantied, and delivered to your door anywhere in Nigeria.',
    whatsappUrl: 'https://wa.me/c/2348034436491',
    whatsappLabel: 'Order on WhatsApp',
    instagramUrl: 'https://www.instagram.com/samtobpc',
    facebookUrl: 'https://www.facebook.com/samtobpc',
    googleReviewUrl: 'https://g.page/r/CXNGNI_XwjLiEBM/review',
    googleReview2Url: 'https://g.page/r/CXhMyf1FL9CgEAg/review',
    googleReview3Url: 'https://g.page/r/CZPUGEG--xoHEAg/review',
    jijiReviewUrl: 'https://jiji.ng/create-opinion/user437607',
    businessHours: 'Mon–Fri 9am–6pm · Sat 9:30am–5pm · Sun Closed',
    stats: {
      physicalStores: 3,
      devicesInStock: 77,
      warrantyYears: 1,
      testedPercent: 100,
    },
    brandsMarquee: ['Apple', 'Samsung', 'HP', 'Dell', 'Lenovo', 'JBL', 'Anker', 'Asus'],
    deliveryNotice:
      'We waybill twice daily — 12noon and 4pm. Orders received before 12noon are treated the same day; orders received after 4pm are treated the next working day.',
    saveToBuyTermsSummary:
      'Save toward this device with weekly or monthly instalments over 1 to 12 months. Transfer each instalment to the Save-to-Buy company account and submit proof in your dashboard — we verify and update your progress. Item ships or is ready for collection once target amount is fully paid and verified.',
  },
  bankTransferAccount: {
    bankName: 'Wema Bank',
    accountNumber: '0127186331',
    accountName: 'Samtob P&C Ltd',
    instructions:
      "Transfer the order total to the account below. We'll confirm your payment and begin processing your order.",
  },
  saveToBuyAccount: {
    bankName: 'Access Bank',
    accountNumber: '0054191226',
    accountName: 'SAMTOP Phones & Computers',
    instructions:
      'Transfer each instalment to the account above and confirm it in your dashboard — we verify and update your progress.',
  },
  bnpl: {
    activeProvider: 'none',
    providerLabel: 'Klump',
    publicKey: '',
    checkoutUrl: '',
    klumpShutDownNotice:
      'Klump has shut down operations and is currently unavailable. No BNPL loan or approval can be processed right now. Please select Bank Transfer (Buy and Pay Now) or Save-to-Buy, or configure a replacement BNPL provider in Admin Settings.',
    termsText: 'Split your payment with Klump. Subject to Klump\'s approval.',
  },
  cloudinary: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
  },
  stores: [
    {
      name: 'Mokola Store',
      address: 'T24, Ground Floor, GSM Plaza, Beside MRS Petrol Station, Mokola Roundabout, Ibadan',
      phone: '08154900493',
      hours: 'Mon–Fri 9am–6pm · Sat 9:30am–5pm · Sun Closed',
    },
    {
      name: 'Iwo Road Store',
      address: 'Beside Bishop Phillips Academy, Iwo Road, Ibadan',
      phone: '07060704481',
      hours: 'Mon–Fri 9am–6pm · Sat 9:30am–5pm · Sun Closed',
    },
    {
      name: 'Challenge Store',
      address: 'Suit B12, Middle Floor, Ogo Oluwa Shopping Complex, Opposite Fidelity Bank, Challenge, Ibadan',
      phone: '08088924598',
      hours: 'Mon–Fri 9am–6pm · Sat 9:30am–5pm · Sun Closed',
    },
  ],
  faqs: [
    {
      q: 'What products does SAMTOB P&C offer?',
      a: 'We sell laptops, phones and gadgets — both brand new and UK used.',
    },
    {
      q: 'What time do you open your physical stores in Ibadan?',
      a: 'Mon–Fri: 9am – 6pm. Saturday: 9:30am – 5pm. Sundays: Closed.',
    },
    {
      q: 'How many years of guaranty do you offer on a laptop or mobile?',
      a: 'Brand new devices come with a 1-year warranty. UK used devices come with a 30-day limited guaranty (laptop/mobile only).',
    },
    {
      q: 'My UK used laptop ran into a problem after 30 days of purchase — what can I do?',
      a: 'Please visit our local store or schedule a pickup service. Our professional technicians will be glad to help, during or after the expiration of your warranty/guaranty. Note: user damage, physical damage and power-related damages are not covered by guaranty/warranty — however our technicians are available to fix these at a token fee.',
    },
    {
      q: 'Can I swap my old device for a new one with SAMTOB P&C?',
      a: "Yes — if you purchased your device from us, we accept trade-ins. We don't accept products bought elsewhere, for genuine reasons.",
    },
    {
      q: 'Do you offer delivery service?',
      a: 'Yes. Free delivery on orders ₦100,000 and above within Ibadan. We also deliver nationwide.',
    },
    {
      q: 'Can I repair my faulty device at SAMTOB P&C?',
      a: 'Yes — we offer professional repair services at an affordable fee.',
    },
    {
      q: 'Can I buy your products online?',
      a: 'Yes, you can buy and pay directly from our website or from our WhatsApp catalogue.',
    },
    {
      q: 'Can I get a cash refund after a purchase has been made?',
      a: "We're sorry, we have no cash refund policy. However, any reason for a refund request will be duly addressed with a win-win approach.",
    },
    {
      q: "My question isn't listed here.",
      a: "Please leave us a message — we'll attend to you shortly.",
    },
  ],
  testimonials: [
    {
      quote: 'Bought a UK used HP laptop, works perfectly and delivery was fast within Ibadan.',
      author: 'Bukola A.',
      rating: 5,
    },
    {
      quote: 'Great customer service, they fixed my phone screen same day at Challenge store.',
      author: 'Emeka O.',
      rating: 5,
    },
    {
      quote: 'Nationwide delivery worked well for me, laptop arrived in 4 days, well packaged.',
      author: 'Fatima Y.',
      rating: 4,
    },
  ],
  deliveryTiers: [
    {
      region: 'ibadan',
      regionLabel: 'Within Ibadan',
      freeThreshold: 100000,
      options: [
        { method: 'door-step', label: 'Next day delivery', fee: 2000, eta: 'Next day' },
        { method: 'same-day', label: 'Same day delivery', fee: 2500, eta: 'Same day' },
      ],
    },
    {
      region: 'southwest',
      regionLabel: 'Outside Ibadan — South West',
      options: [
        { method: 'park-pickup', label: 'Park pick-up (within 24hrs)', fee: 6000, eta: 'within 24hrs' },
        { method: 'door-step', label: 'Door step delivery (3–5 days)', fee: 8000, eta: '3–5 days' },
      ],
    },
    {
      region: 'eastern',
      regionLabel: 'Outside Ibadan — Eastern Region',
      options: [
        { method: 'park-pickup', label: 'Park pick-up (within 24hrs)', fee: 10000, eta: 'within 24hrs' },
        { method: 'door-step', label: 'Door step delivery (3–5 days)', fee: 12000, eta: '3–5 days' },
      ],
    },
    {
      region: 'northern',
      regionLabel: 'Outside Ibadan — Northern Region',
      options: [
        { method: 'park-pickup', label: 'Park pick-up (within 48hrs)', fee: 13000, eta: 'within 48hrs' },
        { method: 'door-step', label: 'Door step delivery (5–7 days)', fee: 15000, eta: '5–7 days' },
      ],
    },
  ],
  termsDocument: {
    title: 'Terms and Conditions',
    content: '',
    awaitingOriginalContent: true,
    lastUpdatedLabel: 'Awaiting original legal text from administrator',
  },
  privacyDocument: {
    title: 'Privacy Policy',
    content: '',
    awaitingOriginalContent: true,
    lastUpdatedLabel: 'Awaiting original privacy policy text from administrator',
  },
};

export function calculateDeliveryFee(
  tiers: DeliveryTier[],
  region: DeliveryRegion,
  method: string,
  subtotal: number
): number {
  const tier = tiers.find((t) => t.region === region);
  if (!tier) return 0;
  if (tier.freeThreshold && subtotal >= tier.freeThreshold) {
    return 0;
  }
  const opt = tier.options.find((o) => o.method === method);
  return opt ? opt.fee : 0;
}
