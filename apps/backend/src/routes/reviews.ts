// reviews.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import { Job } from '../models/Job';
import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  job:      { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  comment:  { type: String, maxlength: 500 },
}, { timestamps: true });
ReviewSchema.index({ reviewee: 1 });
ReviewSchema.index({ job: 1 }, { unique: true });
export const Review = mongoose.model('Review', ReviewSchema);

const router = Router();

// POST /api/reviews
router.post('/', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { jobId, rating, comment } = req.body;
    const job = await Job.findById(jobId);
    if (!job || String(job.customer) !== req.userId) {
      res.status(403).json({ success: false, error: 'Sem permissão para avaliar este trabalho.' }); return;
    }
    const review = await Review.create({ job: jobId, reviewer: req.userId, reviewee: job.provider, rating, comment });

    // Recalculate provider's average rating
    const stats = await Review.aggregate([
      { $match: { reviewee: job.provider } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats[0]) {
      await User.findByIdAndUpdate(job.provider, {
        rating: Math.round(stats[0].avg * 10) / 10,
        reviewCount: stats[0].count,
      });
    }
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
});

// GET /api/reviews/provider/:id
router.get('/provider/:id', authenticate, async (req: any, res: any, next: any) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.id })
      .populate('reviewer', 'fullName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
});

export default router;
