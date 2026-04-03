'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSocket } from '../../hooks/useSocket';
import api from '../../lib/api';
import type { AppNotification } from '@esta-feito/shared';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const { onNotification } = useSocket();
  const [unread, setUnread] = useState(0);

  // Load initial unread count
  useEffect(() => {
    api.get('/notifications')
      .then(res => {
        const items: AppNotification[] = res.data.data ?? [];
        setUnread(items.filter(n => !n.read).length);
      })
      .catch(() => {});
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    return onNotification(() => {
      setUnread(prev => prev + 1);
    });
  }, [onNotification]);

  return (
    <Link href="/dashboard/notifications" className="relative p-2 rounded-lg hover:bg-earth-100 transition-colors">
      <Bell size={20} className="text-muted" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500
                         text-white text-[9px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
