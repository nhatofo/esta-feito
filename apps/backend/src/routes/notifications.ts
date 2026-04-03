// notifications.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:    String,
  title:   String,
  body:    String,
  data:    mongoose.Schema.Types.Mixed,
  read:    { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model('Notification', NotificationSchema);

const router = Router();
router.get('/', authenticate, async (req: any, res: any, next: any) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
});
router.patch('/:id/read', authenticate, async (req: any, res: any, next: any) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});
export default router;
