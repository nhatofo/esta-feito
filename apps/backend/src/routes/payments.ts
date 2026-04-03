import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { paymentService } from '../services/paymentService';
import { Payment } from '../models/Payment';
import { PaymentMethod } from '@esta-feito/shared';
import type { AuthRequest } from '../middleware/auth';
import { Response, NextFunction } from 'express';

const router = Router();

// POST /api/payments/initiate
router.post('/initiate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId, method, phoneNumber } = req.body as {
      jobId: string;
      method: PaymentMethod;
      phoneNumber: string;
    };

    const { payment, deepLinks } = await paymentService.initiatePayment({
      jobId,
      customerId: req.userId!,
      method,
      payerPhone: phoneNumber,
    });

    res.json({ success: true, data: { payment, deepLinks } });
  } catch (err) { next(err); }
});

// GET /api/payments/:jobId - get payment for a job
router.get('/:jobId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payment = await Payment.findOne({ job: req.params.jobId });
    if (!payment) { res.status(404).json({ success: false, error: 'Pagamento não encontrado.' }); return; }
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
});

// POST /api/payments/mpesa/callback - Daraja webhook (no auth — called by M-Pesa)
router.post('/mpesa/callback', async (req, res, next) => {
  try {
    await paymentService.handleMpesaCallback(req.body);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) { next(err); }
});

// POST /api/payments/emola/callback - eMola webhook placeholder
router.post('/emola/callback', async (req, res, next) => {
  try {
    // TODO: implement when eMola API credentials are available
    // Verify signature with EMOLA_API_KEY, update payment status
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/payments/:id/confirm-manual - admin manual confirmation (MVP fallback)
router.post('/:id/confirm-manual', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await paymentService.confirmManually(req.params.id, req.userId!);
    res.json({ success: true, message: 'Pagamento confirmado manualmente.' });
  } catch (err) { next(err); }
});

export default router;
