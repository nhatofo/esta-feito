'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { formatRelativeDate, UserRole } from '@esta-feito/shared';
import { Star } from 'lucide-react';

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: { _id: string; fullName: string; avatarUrl?: string };
  reviewee: { _id: string; fullName: string };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14}
          className={i <= rating ? 'text-brand-500 fill-brand-500' : 'text-earth-100 fill-earth-100'} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  useEffect(() => {
    if (!user) return;
    api.get(`/reviews/provider/${user._id}`)
      .then(res => setReviews(res.data.data ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6 max-w-2xl pb-12">
      <div>
        <h1 className="font-display text-3xl text-ink">Avaliações</h1>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <span className="font-display text-4xl text-ink">{avgRating.toFixed(1)}</span>
            <div>
              <Stars rating={Math.round(avgRating)} />
              <p className="text-xs text-muted mt-0.5">{reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="card p-5 h-28 animate-pulse bg-earth-50" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card p-16 text-center">
          <Star size={40} className="text-earth-100 mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">Sem avaliações ainda</p>
          <p className="text-muted text-sm">Complete trabalhos para receber avaliações.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review._id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center
                                  font-bold text-brand-700 text-sm">
                    {review.reviewer.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink">{review.reviewer.fullName}</p>
                    <p className="text-xs text-muted">{formatRelativeDate(review.createdAt)}</p>
                  </div>
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.comment && (
                <p className="text-sm text-muted leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
