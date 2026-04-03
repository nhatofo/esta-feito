'use client';

import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { formatRelativeDate } from '@esta-feito/shared';
import type { AppNotification } from '@esta-feito/shared';
import { Bell, Check } from 'lucide-react';

const TYPE_ICONS: Record<string, string> = {
  job_posted: '📋', quote_received: '💬', booking_confirmed: '✅',
  job_started: '🚀', job_completed: '🏁', payment_received: '💳',
  review_received: '⭐', chat_message: '💭',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(res => setNotifications(res.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id: string) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    await Promise.all(
      notifications.filter(n => !n.read).map(n => api.patch(`/notifications/${n._id}/read`))
    );
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-5 max-w-2xl pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Notificações</h1>
          {unread > 0 && <p className="text-muted text-sm mt-1">{unread} não lida{unread !== 1 ? 's' : ''}</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm gap-2">
            <Check size={14} /> Marcar todas como lidas
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="card p-4 h-20 animate-pulse bg-earth-50" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell size={40} className="text-earth-100 mx-auto mb-4" />
          <p className="font-semibold text-ink mb-1">Sem notificações</p>
          <p className="text-muted text-sm">Publicar ou aceitar trabalhos gerará notificações.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button
              key={n._id}
              onClick={() => !n.read && markRead(n._id)}
              className={`w-full text-left card p-4 flex items-start gap-4 transition-all ${
                !n.read ? 'border-brand-200 bg-brand-50/40 hover:bg-brand-50' : 'hover:bg-earth-50'
              }`}
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-ink' : 'text-ink'}`}>{n.title}</p>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</p>
                <p className="text-xs text-muted/60 mt-1">{formatRelativeDate(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
