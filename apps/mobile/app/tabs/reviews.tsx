import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star, MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { formatRelativeDate, UserRole } from '@esta-feito/shared';

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: { _id: string; fullName: string };
}

interface CompletedJob {
  _id: string;
  title: string;
  provider: { _id: string; fullName: string };
  customer: { _id: string; fullName: string };
}

function StarRow({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onRate?.(i)} disabled={!onRate}>
          <Star
            size={onRate ? 28 : 14}
            color="#f59e0b"
            fill={i <= rating ? '#f59e0b' : 'transparent'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewsScreen() {
  const { user } = useAuthStore();
  const router   = useRouter();
  const isProvider = user?.role === UserRole.PROVIDER;

  const [reviews, setReviews]           = useState<Review[]>([]);
  const [completedJobs, setCompleted]   = useState<CompletedJob[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedJob, setSelectedJob]   = useState<CompletedJob | null>(null);
  const [rating, setRating]             = useState(0);
  const [comment, setComment]           = useState('');
  const [submitting, setSubmitting]     = useState(false);

  async function load() {
    try {
      if (isProvider) {
        const res = await api.get(`/reviews/provider/${user?._id}`);
        setReviews(res.data.data ?? []);
      } else {
        // Customers: load completed jobs they can still rate
        const res = await api.get('/jobs/my/posted', { params: { status: 'completed' } });
        const jobs: CompletedJob[] = (res.data.data ?? []).filter((j: any) => !j.review);
        setCompleted(jobs);
        // Also load reviews they've given
        const rRes = await api.get(`/reviews/provider/${user?._id}`);
        setReviews(rRes.data.data ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  async function submitReview() {
    if (!selectedJob) return;
    if (rating === 0) { Alert.alert('Avaliação obrigatória', 'Seleccione pelo menos 1 estrela.'); return; }
    setSubmitting(true);
    try {
      await api.post('/reviews', { jobId: selectedJob._id, rating, comment });
      Alert.alert('✓ Avaliação enviada', 'Obrigado pelo seu feedback!');
      setSelectedJob(null); setRating(0); setComment('');
      load();
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Não foi possível enviar a avaliação.');
    } finally { setSubmitting(false); }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1 px-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#f59e0b" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-4 pb-32 gap-5">
          {/* Header */}
          <View>
            <Text className="font-display text-2xl text-ink">Avaliações</Text>
            {isProvider && reviews.length > 0 && (
              <View className="flex-row items-center gap-3 mt-3">
                <Text className="font-display text-4xl text-ink">{avgRating.toFixed(1)}</Text>
                <View>
                  <StarRow rating={Math.round(avgRating)} />
                  <Text className="text-muted text-xs mt-1">
                    {reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Customer: pending reviews */}
          {!isProvider && completedJobs.length > 0 && (
            <View className="gap-3">
              <Text className="font-body-semi text-ink">Trabalhos por avaliar</Text>
              {completedJobs.map(job => (
                <TouchableOpacity
                  key={job._id}
                  onPress={() => setSelectedJob(job)}
                  className={`bg-white rounded-card p-4 border shadow-sm ${
                    selectedJob?._id === job._id ? 'border-brand-500' : 'border-earth-100/60'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text className="font-body-semi text-ink text-sm" numberOfLines={1}>{job.title}</Text>
                  <Text className="text-muted text-xs mt-0.5">
                    Prestador: {job.provider?.fullName ?? '—'}
                  </Text>
                  <View className="mt-2 flex-row items-center gap-1">
                    <Star size={12} color="#f59e0b" />
                    <Text className="text-brand-600 text-xs font-body-semi">Avaliar trabalho</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Review form */}
              {selectedJob && (
                <View className="bg-white rounded-card p-5 border-2 border-brand-200 gap-4">
                  <Text className="font-body-semi text-ink">
                    Avaliar: <Text className="text-brand-600">{selectedJob.title}</Text>
                  </Text>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">
                      Classificação *
                    </Text>
                    <StarRow rating={rating} onRate={setRating} />
                  </View>

                  <View>
                    <Text className="text-xs font-body-semi text-muted uppercase tracking-wide mb-2">
                      Comentário (opcional)
                    </Text>
                    <TextInput
                      className="border border-earth-100 rounded-btn px-4 py-3 text-ink text-sm min-h-[80px]"
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      textAlignVertical="top"
                      placeholder="Descreva a sua experiência…"
                      maxLength={500}
                    />
                  </View>

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => { setSelectedJob(null); setRating(0); setComment(''); }}
                      className="flex-1 border border-earth-100 rounded-btn py-3 items-center"
                    >
                      <Text className="text-muted font-body-semi text-sm">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={submitReview}
                      disabled={submitting || rating === 0}
                      className={`flex-[2] rounded-btn py-3 items-center ${
                        rating > 0 ? 'bg-brand-500' : 'bg-earth-100'
                      }`}
                    >
                      {submitting
                        ? <ActivityIndicator color="white" size="small" />
                        : <Text className={`font-body-semi text-sm ${rating > 0 ? 'text-white' : 'text-muted'}`}>
                            Enviar avaliação
                          </Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Reviews list */}
          {loading ? (
            <View className="py-8 items-center"><ActivityIndicator color="#f59e0b" /></View>
          ) : reviews.length === 0 ? (
            <View className="py-16 items-center">
              <Star size={40} color="#faebd7" />
              <Text className="font-body-semi text-ink mt-3 mb-1">Sem avaliações ainda</Text>
              <Text className="text-muted text-sm text-center">
                {isProvider
                  ? 'Complete trabalhos para receber avaliações.'
                  : 'As suas avaliações aparecerão aqui.'}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {isProvider && <Text className="font-body-semi text-ink">Todas as avaliações</Text>}
              {reviews.map(review => (
                <View key={review._id} className="bg-white rounded-card p-4 border border-earth-100/60 shadow-sm gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-full bg-brand-100 items-center justify-center">
                        <Text className="font-body-semi text-brand-700 text-xs">
                          {review.reviewer.fullName.charAt(0)}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-body-semi text-ink text-sm">{review.reviewer.fullName}</Text>
                        <Text className="text-muted text-xs">{formatRelativeDate(review.createdAt)}</Text>
                      </View>
                    </View>
                    <StarRow rating={review.rating} />
                  </View>
                  {review.comment && (
                    <Text className="text-muted text-sm leading-relaxed">{review.comment}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
