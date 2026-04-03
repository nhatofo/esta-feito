// ─────────────────────────────────────────────
//  Esta Feito — Enhanced Jobs Route
//  Replaces apps/backend/src/routes/jobs.ts
//  Adds push notifications at key lifecycle events
// ─────────────────────────────────────────────

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { generateWhatsAppLink } from '@esta-feito/shared';
import { JobStatus } from '@esta-feito/shared';
import type { AuthRequest } from '../middleware/auth';
import { Response, NextFunction } from 'express';
import { notify } from '../services/notificationService';

const router = Router();

// ── GET /api/jobs ─────────────────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      category, city, lat, lng, radius = '10',
      page = '1', limit = '20', status = JobStatus.OPEN,
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { status };
    if (category) filter.category = category;
    if (city)     filter['address.city'] = { $regex: city, $options: 'i' };

    if (lat && lng) {
      filter['address.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius) * 1000,
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('customer', 'fullName avatarUrl')
        .populate('provider', 'fullName avatarUrl rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { items: jobs, total, page: parseInt(page), limit: parseInt(limit), hasMore: skip + jobs.length < total },
    });
  } catch (err) { next(err); }
});

// ── GET /api/jobs/my/posted ───────────────────
router.get('/my/posted', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as { status?: string };
    const filter: Record<string, unknown> = { customer: req.userId };
    if (status) filter.status = status;
    const jobs = await Job.find(filter)
      .populate('provider', 'fullName avatarUrl rating')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
});

// ── GET /api/jobs/my/assigned ─────────────────
router.get('/my/assigned', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobs = await Job.find({ provider: req.userId })
      .populate('customer', 'fullName avatarUrl phone')
      .sort({ scheduledDate: 1 });
    res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
});

// ── GET /api/jobs/:id ─────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer', 'fullName avatarUrl phone whatsappNumber')
      .populate('provider', 'fullName avatarUrl rating reviewCount phone whatsappNumber')
      .populate('quotes.provider', 'fullName avatarUrl rating reviewCount');
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// ── POST /api/jobs ────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, category, address, budget, scheduledDate, photos } = req.body;

    const job = await Job.create({
      title, description, category, budget,
      scheduledDate: new Date(scheduledDate),
      customer: req.userId,
      photos: photos ?? [],
      address: {
        ...address,
        coordinates: {
          type: 'Point',
          coordinates: [address.longitude, address.latitude],
        },
      },
    });

    await User.findByIdAndUpdate(req.userId, { $inc: { jobsPosted: 1 } });

    // Notify nearby providers asynchronously (don't await — keep response fast)
    notify.newJobPosted({
      _id: String(job._id),
      title: job.title,
      category: job.category,
      address: job.address as any,
      customer: job.customer as any,
    }).catch(() => {/* ignore */});

    res.status(201).json({ success: true, data: job });
  } catch (err) { next(err); }
});

// ── POST /api/jobs/:id/quote ──────────────────
router.post('/:id/quote', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, message, estimatedDuration } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    if (job.status !== JobStatus.OPEN) { res.status(400).json({ success: false, error: 'Este trabalho já não aceita propostas.' }); return; }

    const alreadyQuoted = job.quotes.some(q => String(q.provider) === req.userId);
    if (alreadyQuoted) { res.status(400).json({ success: false, error: 'Já enviou uma proposta.' }); return; }

    job.quotes.push({ provider: req.userId as any, amount, message, estimatedDuration, createdAt: new Date() });
    job.status = JobStatus.QUOTED;
    await job.save();

    // Notify customer
    const provider = await User.findById(req.userId, 'fullName');
    if (provider) {
      notify.quoteReceived(job.customer as any, { _id: String(job._id), title: job.title }, provider.fullName)
        .catch(() => {});
    }

    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// ── POST /api/jobs/:id/accept-quote ──────────
router.post('/:id/accept-quote', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { quoteId } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    if (String(job.customer) !== req.userId) { res.status(403).json({ success: false, error: 'Sem permissão.' }); return; }

    const quote = job.quotes.find((q: any) => String(q._id) === quoteId);
    if (!quote) { res.status(404).json({ success: false, error: 'Proposta não encontrada.' }); return; }

    const provider = await User.findById(quote.provider);
    if (!provider) { res.status(404).json({ success: false, error: 'Prestador não encontrado.' }); return; }

    job.provider    = quote.provider;
    job.agreedPrice = quote.amount;
    job.status      = JobStatus.BOOKED;

    const whatsappPhone = provider.whatsappNumber ?? provider.phone;
    job.whatsappDeepLink = generateWhatsAppLink(whatsappPhone, {
      _id: String(job._id),
      title: job.title,
      category: job.category as any,
      address: job.address as any,
      scheduledDate: job.scheduledDate.toISOString(),
      agreedPrice: quote.amount,
      budget: job.budget,
    });

    await job.save();

    // Notify provider their quote was accepted
    notify.quoteAccepted(quote.provider as any, { _id: String(job._id), title: job.title })
      .catch(() => {});

    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// ── PATCH /api/jobs/:id/complete ─────────────
router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    if (String(job.provider) !== req.userId) { res.status(403).json({ success: false, error: 'Sem permissão.' }); return; }

    job.status        = JobStatus.COMPLETED;
    job.completedDate = new Date();
    await job.save();

    await User.findByIdAndUpdate(req.userId, { $inc: { jobsCompleted: 1 } });

    // Notify customer to rate the job
    notify.jobCompleted(job.customer as any, { _id: String(job._id), title: job.title })
      .catch(() => {});

    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// ── PATCH /api/jobs/:id/cancel ────────────────
router.patch('/:id/cancel', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    const isOwner    = String(job.customer) === req.userId;
    const isProvider = String(job.provider) === req.userId;
    if (!isOwner && !isProvider) { res.status(403).json({ success: false, error: 'Sem permissão.' }); return; }
    if ([JobStatus.COMPLETED, JobStatus.CANCELLED].includes(job.status)) {
      res.status(400).json({ success: false, error: 'Não é possível cancelar este trabalho.' }); return;
    }

    job.status = JobStatus.CANCELLED;
    await job.save();
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

export default router;
