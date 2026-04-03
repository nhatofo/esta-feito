import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { Job } from '../models/Job';
import { User } from '../models/User';
import { generateWhatsAppLink } from '@esta-feito/shared';
import { JobStatus, ServiceCategory, UserRole } from '@esta-feito/shared';
import type { AuthRequest } from '../middleware/auth';
import { Response, NextFunction } from 'express';

const router = Router();

// GET /api/jobs - list open jobs (with geo filter)
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      category, city, lat, lng, radius = '10',
      page = '1', limit = '20', status = JobStatus.OPEN,
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { status };
    if (category) filter.category = category;
    if (city)     filter['address.city'] = { $regex: city, $options: 'i' };

    // Geospatial filter when coordinates are provided
    if (lat && lng) {
      filter['address.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius) * 1000, // metres
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

// GET /api/jobs/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customer', 'fullName avatarUrl phone whatsappNumber')
      .populate('provider', 'fullName avatarUrl rating reviewCount')
      .populate('quotes.provider', 'fullName avatarUrl rating reviewCount');
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// POST /api/jobs - customer posts a new job
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

    // Increment customer's jobsPosted counter
    await User.findByIdAndUpdate(req.userId, { $inc: { jobsPosted: 1 } });

    res.status(201).json({ success: true, data: job });
  } catch (err) { next(err); }
});

// POST /api/jobs/:id/quote - provider submits a quote
router.post('/:id/quote', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, message, estimatedDuration } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    if (job.status !== JobStatus.OPEN) { res.status(400).json({ success: false, error: 'Este trabalho já não aceita propostas.' }); return; }

    // Prevent duplicate quotes from same provider
    const alreadyQuoted = job.quotes.some(q => String(q.provider) === req.userId);
    if (alreadyQuoted) { res.status(400).json({ success: false, error: 'Já enviou uma proposta para este trabalho.' }); return; }

    job.quotes.push({ provider: req.userId as any, amount, message, estimatedDuration, createdAt: new Date() });
    job.status = JobStatus.QUOTED;
    await job.save();

    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// POST /api/jobs/:id/accept-quote - customer accepts a provider's quote
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

    job.provider = quote.provider;
    job.agreedPrice = quote.amount;
    job.status = JobStatus.BOOKED;

    // Generate WhatsApp deep link with job details
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
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// PATCH /api/jobs/:id/complete - provider marks job done
router.patch('/:id/complete', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) { res.status(404).json({ success: false, error: 'Trabalho não encontrado.' }); return; }
    if (String(job.provider) !== req.userId) { res.status(403).json({ success: false, error: 'Sem permissão.' }); return; }

    job.status = JobStatus.COMPLETED;
    job.completedDate = new Date();
    await job.save();

    await User.findByIdAndUpdate(req.userId, { $inc: { jobsCompleted: 1 } });
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
});

// GET /api/jobs/my/posted - customer's own jobs
router.get('/my/posted', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobs = await Job.find({ customer: req.userId })
      .populate('provider', 'fullName avatarUrl rating')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
});

// GET /api/jobs/my/assigned - provider's booked/active jobs
router.get('/my/assigned', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobs = await Job.find({ provider: req.userId })
      .populate('customer', 'fullName avatarUrl phone')
      .sort({ scheduledDate: 1 });
    res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
});

export default router;
