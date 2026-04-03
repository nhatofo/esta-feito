// chat.ts — in-app chat via Socket.io (REST for history)
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  jobId:      { type: String, required: true, index: true },
  sender:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: String,
  content:    { type: String, required: true },
  type:       { type: String, enum: ['text', 'image'], default: 'text' },
  imageUrl:   String,
  readAt:     Date,
}, { timestamps: true });
const Message = mongoose.model('Message', MessageSchema);

const router = Router();
router.get('/:jobId', authenticate, async (req: any, res: any, next: any) => {
  try {
    const messages = await Message.find({ jobId: req.params.jobId })
      .populate('sender', 'fullName avatarUrl')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json({ success: true, data: messages });
  } catch (err) { next(err); }
});
export const chatRouter = router;
export { Message };
export default router;
