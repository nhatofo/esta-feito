// ─────────────────────────────────────────────
//  Esta Feito — Push Notification Service
//  Uses Expo Push Notifications API (free, no Firebase setup needed)
//  Docs: https://docs.expo.dev/push-notifications/sending-notifications/
// ─────────────────────────────────────────────

import axios from 'axios';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import mongoose from 'mongoose';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;          // Expo push token
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default';
  badge?: number;
}

/**
 * Sends a push notification to a single Expo push token.
 * Silently fails if the token is invalid or missing — never throws.
 */
async function sendPush(message: PushMessage): Promise<void> {
  try {
    await axios.post(EXPO_PUSH_URL, message, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    logger.warn('Push notification failed:', err);
  }
}

/**
 * Sends a push notification to one or more users by their MongoDB user IDs.
 * Looks up each user's expoPushToken from the database.
 */
export async function notifyUsers(
  userIds: (string | mongoose.Types.ObjectId)[],
  notification: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  try {
    const users = await User.find(
      { _id: { $in: userIds }, expoPushToken: { $exists: true, $ne: '' } },
      { expoPushToken: 1 }
    );

    if (!users.length) return;

    await Promise.allSettled(
      users.map(u =>
        sendPush({
          to: u.expoPushToken!,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
        })
      )
    );
  } catch (err) {
    logger.error('notifyUsers error:', err);
  }
}

// ── Pre-built notification templates ─────────

export const notify = {
  /** Tell all available providers about a new job in their category/city */
  async newJobPosted(job: {
    _id: string;
    title: string;
    category: string;
    address: { city: string };
    customer: mongoose.Types.ObjectId;
  }) {
    // Find providers who cover this category and are near this city
    const providers = await User.find({
      role: 'provider',
      isApproved: true,
      isActive: true,
      categories: job.category,
      'address.city': { $regex: job.address.city, $options: 'i' },
      expoPushToken: { $exists: true, $ne: '' },
    }, { _id: 1 });

    if (!providers.length) return;

    await Promise.allSettled(
      providers.map(p =>
        sendPush({
          to: p.expoPushToken!,
          title: '🔔 Novo trabalho disponível',
          body: `"${job.title}" em ${job.address.city} — envie a sua proposta!`,
          data: { jobId: String(job._id), type: 'job_posted' },
          sound: 'default',
        })
      )
    );
  },

  /** Tell the provider their quote was accepted */
  async quoteAccepted(providerId: mongoose.Types.ObjectId, job: { _id: string; title: string }) {
    await notifyUsers([providerId], {
      title: '✅ Proposta aceite!',
      body: `A sua proposta para "${job.title}" foi aceite. Prepare-se!`,
      data: { jobId: String(job._id), type: 'booking_confirmed' },
    });
  },

  /** Tell the customer a quote arrived */
  async quoteReceived(customerId: mongoose.Types.ObjectId, job: { _id: string; title: string }, providerName: string) {
    await notifyUsers([customerId], {
      title: '💬 Nova proposta recebida',
      body: `${providerName} enviou uma proposta para "${job.title}"`,
      data: { jobId: String(job._id), type: 'quote_received' },
    });
  },

  /** Tell the customer their job was marked complete */
  async jobCompleted(customerId: mongoose.Types.ObjectId, job: { _id: string; title: string }) {
    await notifyUsers([customerId], {
      title: '🏁 Trabalho concluído',
      body: `"${job.title}" foi marcado como concluído. Avalie o prestador!`,
      data: { jobId: String(job._id), type: 'job_completed' },
    });
  },

  /** Tell the provider payment was confirmed */
  async paymentConfirmed(providerId: mongoose.Types.ObjectId, amount: number) {
    await notifyUsers([providerId], {
      title: '💳 Pagamento recebido',
      body: `Recebeu MT ${amount.toLocaleString('pt-MZ')} na sua conta.`,
      data: { type: 'payment_received' },
    });
  },

  /** Real-time chat message notification (fallback when app is in background) */
  async chatMessage(
    recipientId: mongoose.Types.ObjectId,
    senderName: string,
    preview: string,
    jobId: string
  ) {
    await notifyUsers([recipientId], {
      title: `💬 ${senderName}`,
      body: preview.length > 60 ? preview.slice(0, 57) + '…' : preview,
      data: { jobId, type: 'chat_message' },
    });
  },
};
