// admin.ts
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { User } from '../models/User';
import { Job } from '../models/Job';
import { Payment } from '../models/Payment';
import { UserRole } from '@esta-feito/shared';

const router = Router();
router.use(authenticate, requireRole(UserRole.ADMIN));

router.get('/stats', async (_req, res, next) => {
  try {
    const [users, jobs, payments] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Payment.aggregate([{ $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { users, jobs, payments } });
  } catch (err) { next(err); }
});

router.get('/providers/pending', async (_req, res, next) => {
  try {
    const providers = await User.find({ role: 'provider', isApproved: false })
      .select('fullName phone email createdAt idDocumentUrl');
    res.json({ success: true, data: providers });
  } catch (err) { next(err); }
});

router.patch('/providers/:id/approve', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isApproved: true });
    res.json({ success: true, message: 'Prestador aprovado.' });
  } catch (err) { next(err); }
});

export default router;
