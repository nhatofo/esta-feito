'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import api from '../../../../lib/api';
import { useAuthStore } from '../../../../store/authStore';
import { SOCKET_EVENTS, formatRelativeDate } from '@esta-feito/shared';
import type { ChatMessage } from '@esta-feito/shared';
import { Send, ArrowLeft, Phone } from 'lucide-react';

export default function ChatPage() {
  const { jobId }  = useParams<{ jobId: string }>();
  const router     = useRouter();
  const { user, tokens } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef  = useRef<Socket | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // Load history + connect socket
  useEffect(() => {
    async function init() {
      try {
        const res = await api.get(`/chat/${jobId}`);
        setMessages(res.data.data ?? []);
      } finally { setLoading(false); }
    }
    init();

    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000', {
      auth: { token: tokens?.accessToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit(SOCKET_EVENTS.JOIN_JOB_ROOM, jobId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current = socket;
    return () => { socket.emit(SOCKET_EVENTS.LEAVE_JOB_ROOM, jobId); socket.disconnect(); };
  }, [jobId, tokens]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;
    socketRef.current.emit(SOCKET_EVENTS.SEND_MESSAGE, {
      jobId,
      content: input.trim(),
      senderName: user?.fullName ?? 'Utilizador',
      type: 'text',
    });
    setInput('');
  }

  const isMine = (msg: ChatMessage) => msg.sender === user?._id;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-earth-100 mb-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-earth-100 transition-colors">
          <ArrowLeft size={18} className="text-muted" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg text-ink">Chat do trabalho</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-earth-300'}`} />
            <span className="text-xs text-muted">{connected ? 'Ligado' : 'A ligar…'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
                <div className="h-12 w-48 rounded-2xl bg-earth-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16 text-center">
            <div>
              <div className="text-5xl mb-3">💬</div>
              <p className="font-semibold text-ink mb-1">Sem mensagens ainda</p>
              <p className="text-muted text-sm">Inicie a conversa com o prestador.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = isMine(msg);
            return (
              <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!mine && (
                    <span className="text-xs text-muted px-1">{msg.senderName}</span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    mine
                      ? 'bg-brand-500 text-white rounded-tr-sm'
                      : 'bg-white border border-earth-100 text-ink rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-muted px-1">{formatRelativeDate(msg.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-3 pt-4 border-t border-earth-100 mt-4">
        <input
          className="input flex-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escrever mensagem…"
          disabled={!connected}
        />
        <button
          type="submit"
          disabled={!input.trim() || !connected}
          className="btn-primary px-4 disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
