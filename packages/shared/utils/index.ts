// ─────────────────────────────────────────────
//  Esta Feito – Shared Utilities
//  Used by backend, web and mobile
// ─────────────────────────────────────────────

import type { Job, PaymentDeepLinks } from '../types';

// ── Constants ────────────────────────────────

export const MOZAMBIQUE_COUNTRY_CODE = '+258';
export const PLATFORM_COMMISSION_RATE = 0.15; // 15%
export const CURRENCY = 'MZN';
export const CURRENCY_SYMBOL = 'MT';

// ── Phone number utils ────────────────────────

/**
 * Normalises a Mozambican phone number to E.164 format (+258XXXXXXXXX).
 * Accepts: 84XXXXXXX, 258XXXXXXXXX, +258XXXXXXXXX
 */
export function normalizeMozPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('258') && digits.length === 11) return `+${digits}`;
  if (digits.length === 9) return `+258${digits}`;
  return `+${digits}`;
}

/**
 * Returns true for valid Mozambican mobile numbers.
 * Vodacom: 84, 85  |  Movitel: 86  |  Tmcel: 82, 83
 */
export function isValidMozPhone(phone: string): boolean {
  const normalized = normalizeMozPhone(phone);
  return /^\+258(8[2-6])\d{7}$/.test(normalized);
}

/** Strips country code for display: +25884... → 84... */
export function displayPhone(phone: string): string {
  return phone.replace(/^\+258/, '');
}

// ── WhatsApp deep links ───────────────────────

/**
 * Generates a WhatsApp deep link with a pre-filled message
 * containing job details. Opens the wa.me shortlink which works
 * on both web (WhatsApp Web) and mobile (WhatsApp app).
 */
export function generateWhatsAppLink(
  providerPhone: string,
  job: Pick<Job, '_id' | 'title' | 'category' | 'address' | 'scheduledDate' | 'agreedPrice' | 'budget'>
): string {
  const phone = normalizeMozPhone(providerPhone).replace('+', '');
  const price = job.agreedPrice ?? job.budget;
  const date = new Date(job.scheduledDate).toLocaleDateString('pt-MZ', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const message = [
    `Olá! Sou um cliente da plataforma *Esta Feito*.`,
    ``,
    `📋 *Detalhes do trabalho:*`,
    `• Título: ${job.title}`,
    `• Categoria: ${translateCategory(job.category)}`,
    `• Local: ${job.address.neighbourhood ?? ''}, ${job.address.city}`,
    `• Data: ${date}`,
    `• Valor combinado: ${formatCurrency(price)}`,
    `• Ref: #${job._id.slice(-6).toUpperCase()}`,
    ``,
    `Por favor confirme a sua disponibilidade.`,
  ].join('\n');

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

// ── M-Pesa deep links (Vodacom Mozambique) ────
//
//  Vodacom Mozambique uses a customised Daraja API endpoint.
//  PRODUCTION base URL: https://api.vm.co.mz/
//  SANDBOX base URL:    https://sandbox.safaricom.co.ke/  (use for dev)
//
//  The mobile deep link opens the M-Pesa app directly on the device.
//  Format: mpesa://pay?amount=XXX&msisdn=258XXXXXXXXX&reference=XXX
//  Note: the deep link scheme may vary — confirm with Vodacom Mozambique
//  partner team before going to production.

export function generateMpesaDeepLink(params: {
  amount: number;
  providerPhone: string;
  reference: string;
  description?: string;
}): string {
  const phone = normalizeMozPhone(params.providerPhone).replace('+', '');
  const queryParams = new URLSearchParams({
    amount: String(Math.round(params.amount)),
    msisdn: phone,
    reference: params.reference,
    description: params.description ?? 'Esta Feito - Pagamento de servico',
  });
  // Deep link that opens M-Pesa app on mobile
  return `mpesa://pay?${queryParams.toString()}`;
}

// ── eMola deep links (Movitel Mozambique) ─────
//
//  eMola is operated by Movitel (Mozambique).
//  PRODUCTION merchant API: Contact Movitel at https://www.movitel.co.mz/emola
//  Deep link format (unofficial — verify with Movitel partner portal):
//  emola://transfer?to=258XXXXXXXXX&amount=XXX&ref=XXX
//
//  For the merchant payment request API, Movitel provides a REST endpoint
//  after signing a merchant agreement. Until then, the deep link below
//  opens the eMola app with pre-filled transfer details.

export function generateEmolaDeepLink(params: {
  amount: number;
  providerPhone: string;
  reference: string;
  description?: string;
}): string {
  const phone = normalizeMozPhone(params.providerPhone).replace('+', '');
  const queryParams = new URLSearchParams({
    to: phone,
    amount: String(Math.round(params.amount)),
    ref: params.reference,
    note: params.description ?? 'Esta Feito - Pagamento de servico',
  });
  // Deep link that opens eMola app on mobile
  return `emola://transfer?${queryParams.toString()}`;
}

/**
 * Generates all payment deep links for a job payment.
 * Returns whichever links are applicable based on provider's registered methods.
 */
export function generatePaymentDeepLinks(params: {
  amount: number;
  providerPhone: string;
  whatsappPhone?: string;
  jobId: string;
  jobTitle: string;
}): PaymentDeepLinks {
  const reference = `EF-${params.jobId.slice(-8).toUpperCase()}`;
  const description = `Esta Feito: ${params.jobTitle}`;

  return {
    mpesa: generateMpesaDeepLink({
      amount: params.amount,
      providerPhone: params.providerPhone,
      reference,
      description,
    }),
    emola: generateEmolaDeepLink({
      amount: params.amount,
      providerPhone: params.providerPhone,
      reference,
      description,
    }),
  };
}

// ── Currency formatting ───────────────────────

/** Formats a number as Mozambican Metical: 1500 → "MT 1.500,00" */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Calculates platform fee and provider payout */
export function calculatePaymentSplit(totalAmount: number): {
  platformFee: number;
  providerAmount: number;
} {
  const platformFee = Math.round(totalAmount * PLATFORM_COMMISSION_RATE);
  return {
    platformFee,
    providerAmount: totalAmount - platformFee,
  };
}

// ── Category translation (PT) ─────────────────

const CATEGORY_LABELS_PT: Record<string, string> = {
  plumbing: 'Canalização',
  cleaning: 'Limpeza',
  electrical: 'Electricidade',
  painting: 'Pintura',
  moving: 'Mudanças',
  mining_equipment: 'Equipamento Mineiro',
  carpentry: 'Carpintaria',
  security: 'Segurança',
  gardening: 'Jardinagem',
  other: 'Outro',
};

export function translateCategory(category: string): string {
  return CATEGORY_LABELS_PT[category] ?? category;
}

// ── Date utils ────────────────────────────────

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return date.toLocaleDateString('pt-MZ');
}

// ── Validation ────────────────────────────────

export function validateJobBudget(budget: number): boolean {
  return budget >= 500 && budget <= 5_000_000; // MT 500 – MT 5,000,000
}

export function validateRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}
