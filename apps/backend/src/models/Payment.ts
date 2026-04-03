import mongoose, { Schema, Document } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '@esta-feito/shared';

export interface IPayment extends Document {
  job: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;
  amount: number;
  platformFee: number;
  providerAmount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  // M-Pesa
  mpesaTransactionId?: string;
  mpesaCheckoutRequestId?: string;
  mpesaMerchantRequestId?: string;
  // eMola
  emolaTransactionId?: string;
  emolaReference?: string;
  // Deep links generated for this payment
  mpesaDeepLink?: string;
  emolaDeepLink?: string;
  // Manual confirmation fallback (for MVP when webhooks aren't live)
  manuallyConfirmed?: boolean;
  confirmedBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
}

const PaymentSchema = new Schema<IPayment>({
  job:      { type: Schema.Types.ObjectId, ref: 'Job', required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  amount:         { type: Number, required: true },
  platformFee:    { type: Number, required: true },
  providerAmount: { type: Number, required: true },

  method: { type: String, enum: Object.values(PaymentMethod), required: true },
  status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },

  // M-Pesa fields
  mpesaTransactionId:      String,
  mpesaCheckoutRequestId:  String,
  mpesaMerchantRequestId:  String,

  // eMola fields
  emolaTransactionId: String,
  emolaReference:     String,

  // Generated deep links
  mpesaDeepLink: String,
  emolaDeepLink: String,

  // Manual confirmation
  manuallyConfirmed: { type: Boolean, default: false },
  confirmedBy:       { type: Schema.Types.ObjectId, ref: 'User' },
  confirmedAt:       Date,
}, {
  timestamps: true,
});

PaymentSchema.index({ job: 1 });
PaymentSchema.index({ customer: 1 });
PaymentSchema.index({ provider: 1 });
PaymentSchema.index({ status: 1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
