import axios from 'axios';
import { generatePaymentDeepLinks, calculatePaymentSplit, normalizeMozPhone } from '@esta-feito/shared';
import type { PaymentDeepLinks } from '@esta-feito/shared';
import { Payment } from '../models/Payment';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { PaymentMethod, PaymentStatus } from '@esta-feito/shared';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────
//  M-Pesa / Daraja (Vodacom Mozambique)
//
//  Development/testing: Safaricom Kenya Daraja sandbox
//    https://sandbox.safaricom.co.ke/
//  Production (Vodacom MZ): Apply via
//    https://developer.vodacom.co.mz (or contact vmz partner team)
//    Base URL: https://api.vm.co.mz/mpesa/
//
//  Flow: STK Push → customer approves on phone → callback fires
// ─────────────────────────────────────────────

const MPESA_BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.vm.co.mz/mpesa'        // ← Vodacom MZ production
  : 'https://sandbox.safaricom.co.ke';   // ← Safaricom sandbox (dev)

async function getMpesaAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  return response.data.access_token as string;
}

function getMpesaPassword(): { password: string; timestamp: string } {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const rawPassword = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  const password = Buffer.from(rawPassword).toString('base64');
  return { password, timestamp };
}

/**
 * Initiates an M-Pesa STK Push (Lipa na M-Pesa).
 * The customer receives a prompt on their phone to enter their M-Pesa PIN.
 */
export async function initiateMpesaSTKPush(params: {
  phoneNumber: string;  // +258XXXXXXXXX
  amount: number;
  reference: string;
  description: string;
}): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
  const token = await getMpesaAccessToken();
  const { password, timestamp } = getMpesaPassword();
  const phone = normalizeMozPhone(params.phoneNumber).replace('+', '');

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(params.amount),
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: params.reference,
    TransactionDesc: params.description,
  };

  const response = await axios.post(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return {
    checkoutRequestId: response.data.CheckoutRequestID as string,
    merchantRequestId: response.data.MerchantRequestID as string,
  };
}

// ─────────────────────────────────────────────
//  eMola (Movitel Mozambique)
//
//  To get production credentials:
//  1. Visit https://www.movitel.co.mz/emola
//  2. Register as a merchant partner
//  3. Request API credentials from Movitel business team
//
//  For MVP: Use deep links only (opens eMola app).
//  When API credentials are available, replace the stub below
//  with real API calls to EMOLA_API_URL.
// ─────────────────────────────────────────────

export async function initiateEmolaPayment(params: {
  phoneNumber: string;
  amount: number;
  reference: string;
  description: string;
}): Promise<{ transactionId: string }> {
  // TODO: Replace with real eMola Merchant API call when credentials available.
  // Endpoint (confirm with Movitel): POST ${process.env.EMOLA_API_URL}/merchant/payment
  // Headers: { 'X-Merchant-Id': EMOLA_MERCHANT_ID, 'X-Api-Key': EMOLA_API_KEY }
  // Body: { msisdn, amount, reference, description }

  logger.warn('eMola API not yet configured — using deep link fallback only.');
  return { transactionId: `EMOLA-PENDING-${Date.now()}` };
}

// ─────────────────────────────────────────────
//  Payment service (orchestration)
// ─────────────────────────────────────────────

export const paymentService = {

  /**
   * Creates a Payment record and generates deep links.
   * For STK-push methods (M-Pesa), also initiates the push.
   */
  async initiatePayment(params: {
    jobId: string;
    customerId: string;
    method: PaymentMethod;
    payerPhone: string;
  }): Promise<{ payment: InstanceType<typeof Payment>; deepLinks: PaymentDeepLinks }> {
    const job = await Job.findById(params.jobId).populate('provider');
    if (!job) throw new Error('Trabalho não encontrado.');
    if (!job.agreedPrice) throw new Error('Preço ainda não foi acordado.');

    const provider = await User.findById(job.provider);
    if (!provider) throw new Error('Prestador não encontrado.');

    const { platformFee, providerAmount } = calculatePaymentSplit(job.agreedPrice);

    const reference = `EF-${params.jobId.slice(-8).toUpperCase()}`;
    const description = `Esta Feito: ${job.title}`;
    const providerPhone = provider.bankDetails?.mpesaNumber
      ?? provider.bankDetails?.emolaNumber
      ?? provider.phone;

    // Generate mobile deep links (works without API keys)
    const deepLinks = generatePaymentDeepLinks({
      amount: providerAmount,
      providerPhone,
      jobId: params.jobId,
      jobTitle: job.title,
    });

    let checkoutRequestId: string | undefined;
    let merchantRequestId: string | undefined;
    let emolaTransactionId: string | undefined;

    // Attempt STK push / API initiation
    try {
      if (params.method === PaymentMethod.MPESA) {
        const result = await initiateMpesaSTKPush({
          phoneNumber: params.payerPhone,
          amount: job.agreedPrice,
          reference,
          description,
        });
        checkoutRequestId = result.checkoutRequestId;
        merchantRequestId = result.merchantRequestId;
      } else if (params.method === PaymentMethod.EMOLA) {
        const result = await initiateEmolaPayment({
          phoneNumber: params.payerPhone,
          amount: job.agreedPrice,
          reference,
          description,
        });
        emolaTransactionId = result.transactionId;
      }
    } catch (err) {
      // STK push failed — deep links still work as fallback
      logger.warn('STK push failed, falling back to deep links:', err);
    }

    const payment = await Payment.create({
      job: params.jobId,
      customer: params.customerId,
      provider: job.provider,
      amount: job.agreedPrice,
      platformFee,
      providerAmount,
      method: params.method,
      status: PaymentStatus.PENDING,
      mpesaCheckoutRequestId: checkoutRequestId,
      mpesaMerchantRequestId: merchantRequestId,
      emolaTransactionId,
      mpesaDeepLink: deepLinks.mpesa,
      emolaDeepLink: deepLinks.emola,
    });

    return { payment, deepLinks };
  },

  /**
   * Handles M-Pesa callback from Daraja (called by webhook).
   */
  async handleMpesaCallback(body: Record<string, unknown>): Promise<void> {
    const stkCallback = (body as any)?.Body?.stkCallback;
    if (!stkCallback) return;

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;
    const payment = await Payment.findOne({ mpesaCheckoutRequestId: CheckoutRequestID });
    if (!payment) return;

    if (ResultCode === 0) {
      // Success — extract transaction ID from metadata
      const items: Array<{ Name: string; Value: unknown }> = CallbackMetadata?.Item ?? [];
      const txId = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value as string;

      payment.status = PaymentStatus.COMPLETED;
      payment.mpesaTransactionId = txId;
      payment.confirmedAt = new Date();
    } else {
      payment.status = PaymentStatus.FAILED;
    }

    await payment.save();
    logger.info(`M-Pesa callback: ${CheckoutRequestID} → ${payment.status}`);
  },

  /**
   * Manual payment confirmation (MVP fallback when webhooks aren't live).
   */
  async confirmManually(paymentId: string, adminId: string): Promise<void> {
    await Payment.findByIdAndUpdate(paymentId, {
      status: PaymentStatus.COMPLETED,
      manuallyConfirmed: true,
      confirmedBy: adminId,
      confirmedAt: new Date(),
    });
  },
};
