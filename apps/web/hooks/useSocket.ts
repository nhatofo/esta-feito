import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { SOCKET_EVENTS } from '@esta-feito/shared';
import type { ChatMessage, AppNotification } from '@esta-feito/shared';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api')
  .replace('/api', '');

/**
 * Connects to the Socket.io server and returns helpers
 * for joining job rooms and listening to events.
 */
export function useSocket() {
  const { tokens } = useAuthStore();
  const socketRef  = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!tokens?.accessToken) return;

    const socket = io(API_BASE, {
      auth: { token: tokens.accessToken },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [tokens?.accessToken]);

  function joinJob(jobId: string) {
    socketRef.current?.emit(SOCKET_EVENTS.JOIN_JOB_ROOM, jobId);
  }

  function leaveJob(jobId: string) {
    socketRef.current?.emit(SOCKET_EVENTS.LEAVE_JOB_ROOM, jobId);
  }

  function sendMessage(jobId: string, content: string, senderName: string) {
    socketRef.current?.emit(SOCKET_EVENTS.SEND_MESSAGE, { jobId, content, senderName, type: 'text' });
  }

  function onMessage(handler: (msg: ChatMessage) => void) {
    socketRef.current?.on(SOCKET_EVENTS.NEW_MESSAGE, handler);
    return () => { socketRef.current?.off(SOCKET_EVENTS.NEW_MESSAGE, handler); };
  }

  function onNotification(handler: (n: AppNotification) => void) {
    socketRef.current?.on(SOCKET_EVENTS.NOTIFICATION, handler);
    return () => { socketRef.current?.off(SOCKET_EVENTS.NOTIFICATION, handler); };
  }

  function onJobUpdate(handler: (data: unknown) => void) {
    socketRef.current?.on(SOCKET_EVENTS.JOB_UPDATED, handler);
    return () => { socketRef.current?.off(SOCKET_EVENTS.JOB_UPDATED, handler); };
  }

  return { connected, joinJob, leaveJob, sendMessage, onMessage, onNotification, onJobUpdate };
}
