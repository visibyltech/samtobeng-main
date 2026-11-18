import { BnplSettings, OrderItem } from '../types';

export interface BnplCheckoutPayload {
  orderId: string;
  merchantReference: string;
  amount: number;
  shippingFee: number;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone: string;
  items: OrderItem[];
  redirectUrl: string;
}

export interface BnplAvailabilityResult {
  available: boolean;
  provider: 'none' | 'klump' | 'custom';
  title: string;
  subtitle: string;
  controlledMessage?: string;
}

export function getBnplAvailability(settings: BnplSettings): BnplAvailabilityResult {
  if (settings.activeProvider === 'none') {
    return {
      available: false,
      provider: 'none',
      title: 'Klump Widget Unavailable',
      subtitle: 'Try a different payment method',
      controlledMessage:
        settings.klumpShutDownNotice ||
        'Buy Now, Pay Later via Klump is currently unavailable because Klump has shut down operations. Please use Bank Transfer (Buy and Pay Now) or Save-to-Buy, or configure a replacement BNPL provider in Admin Settings.',
    };
  }

  if (settings.activeProvider === 'klump') {
    return {
      available: false,
      provider: 'klump',
      title: 'Klump Widget Unavailable',
      subtitle: 'Klump has ceased operations — select Bank Transfer or Save-to-Buy',
      controlledMessage:
        'Klump has announced its shutdown and cannot process new BNPL loans. No payment has been charged or approved. Please choose Bank Transfer or Save-to-Buy, or configure a replacement BNPL provider in Admin Settings.',
    };
  }

  if (!settings.publicKey?.trim() || !settings.checkoutUrl?.trim()) {
    return {
      available: false,
      provider: 'custom',
      title: `${settings.providerLabel || 'BNPL Provider'} Not Configured`,
      subtitle: 'Missing provider credentials in Admin Settings',
      controlledMessage:
        'A replacement BNPL provider is selected but not yet configured with valid credentials. Please complete configuration in Admin > Website & Payment Settings.',
    };
  }

  return {
    available: true,
    provider: 'custom',
    title: `Pay with ${settings.providerLabel || 'BNPL'} — Buy Now, Pay Later`,
    subtitle: `${settings.providerLabel || 'BNPL'} Pay in Instalments`,
  };
}

/**
 * Initiates a configured replacement BNPL checkout session.
 * Strictly refuses to fake approvals or simulate Klump transactions.
 */
export async function launchReplacementBnpl(
  settings: BnplSettings,
  payload: BnplCheckoutPayload
): Promise<{ launched: boolean; message: string }> {
  const availability = getBnplAvailability(settings);
  if (!availability.available) {
    return {
      launched: false,
      message:
        availability.controlledMessage ||
        'No active BNPL provider is configured. Cannot proceed with BNPL payment.',
    };
  }

  // Forward to configured external BNPL checkout endpoint without ever faking approval
  const targetUrl = new URL(settings.checkoutUrl);
  targetUrl.searchParams.set('reference', payload.merchantReference);
  targetUrl.searchParams.set('amount', String(Math.round(payload.amount)));
  targetUrl.searchParams.set('email', payload.customerEmail);
  window.location.assign(targetUrl.toString());

  return {
    launched: true,
    message: `Redirecting to ${settings.providerLabel}...`,
  };
}
