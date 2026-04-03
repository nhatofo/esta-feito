import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SOCKET_EVENTS } from '@esta-feito/shared';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initSocketHandlers(io: Server): void {

  // Auth middleware for Socket.io
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Token em falta.'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Token inválido.'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join a job-specific chat room
    socket.on(SOCKET_EVENTS.JOIN_JOB_ROOM, (jobId: string) => {
      socket.join(`job:${jobId}`);
      logger.info(`User ${socket.userId} joined room job:${jobId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_JOB_ROOM, (jobId: string) => {
      socket.leave(`job:${jobId}`);
    });

    // Relay chat messages to the job room
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data: {
      jobId: string;
      content: string;
      senderName: string;
      type?: 'text' | 'image';
      imageUrl?: string;
    }) => {
      const message = {
        _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        jobId: data.jobId,
        sender: socket.userId,
        senderName: data.senderName,
        content: data.content,
        type: data.type ?? 'text',
        imageUrl: data.imageUrl,
        createdAt: new Date().toISOString(),
      };

      // Broadcast to all users in the job room (including sender for confirmation)
      io.to(`job:${data.jobId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}

/** Emits a job update event to all connected clients in a job room */
export function emitJobUpdate(io: Server, jobId: string, data: unknown): void {
  io.to(`job:${jobId}`).emit(SOCKET_EVENTS.JOB_UPDATED, data);
}

/** Sends a notification to a specific user's personal room */
export function emitNotification(io: Server, userId: string, notification: unknown): void {
  io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION, notification);
}
