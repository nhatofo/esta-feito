import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import type { AuthRequest } from '../middleware/auth';
import { Response, NextFunction } from 'express';

const router = Router();

// GET /api/providers - browse approved providers
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, city, lat, lng, radius = '10', page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { role: 'provider', isApproved: true, isActive: true };
    if (category) filter.categories = category;
    if (city) filter['address.city'] = { $regex: city, $options: 'i' };

    if (lat && lng) {
      filter['address.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius) * 1000,
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [providers, total] = await Promise.all([
      User.find(filter)
        .select('fullName avatarUrl rating reviewCount categories bio yearsExperience address jobsCompleted')
        .skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items: providers, total, page: parseInt(page), hasMore: skip + providers.length < total } });
  } catch (err) { next(err); }
});

// GET /api/providers/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' })
      .select('-otp -otpExpiry -refreshToken -bankDetails');
    if (!provider) { res.status(404).json({ success: false, error: 'Prestador não encontrado.' }); return; }
    res.json({ success: true, data: provider });
  } catch (err) { next(err); }
});

// PATCH /api/providers/me - provider updates own profile
router.patch('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const allowed = ['bio', 'categories', 'skills', 'yearsExperience', 'availabilityRadius',
                     'whatsappNumber', 'bankDetails', 'expoPushToken', 'address', 'fullName', 'avatarUrl'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true })
      .select('-otp -otpExpiry -refreshToken');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

export default router;
