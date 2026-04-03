import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { SOCKET_EVENTS, formatRelativeDate } from '@esta-feito/shared';
import type { ChatMessage } from '@esta-feito/shared';

export default function ChatScreen() {
  const { jobId }  = useLocalSearchParams<{ jobId: string }>();
  const router     = useRouter();
  const { user, tokens } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef  = useRef<Socket | null>(null);
  const listRef    = useRef<FlatList>(null);

  const API_BASE = (Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:5000/api')
    .replace('/api', '');

  useEffect(() => {
    // Load history
    api.get(`/chat/${jobId}`)
      .then(res => setMessages(res.data.data ?? []))
      .finally(() => setLoading(false));

    // Connect socket
    const socket = io(API_BASE, {
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
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socketRef.current = socket;
    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_JOB_ROOM, jobId);
      socket.disconnect();
    };
  }, [jobId, tokens]);

  function sendMessage() {
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

  function renderMessage({ item }: { item: ChatMessage }) {
    const mine = isMine(item);
    return (
      <View className={`mb-3 ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && (
          <Text className="text-xs text-muted mb-1 px-1">{item.senderName}</Text>
        )}
        <View className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
          mine
            ? 'bg-brand-500 rounded-tr-sm'
            : 'bg-white border border-earth-100 rounded-tl-sm shadow-sm'
        }`}>
          <Text className={`text-sm leading-relaxed ${mine ? 'text-white' : 'text-ink'}`}>
            {item.content}
          </Text>
        </View>
        <Text className="text-xs text-muted/60 mt-1 px-1">{formatRelativeDate(item.createdAt)}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-earth-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-lg">
          <ArrowLeft size={20} color="#78716c" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-body-semi text-ink">Chat do trabalho</Text>
          <View className="flex-row items-center gap-1.5">
            <View className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-earth-300'}`} />
            <Text className="text-xs text-muted">{connected ? 'Ligado' : 'A ligar…'}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#f59e0b" size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-4xl mb-3">💬</Text>
                <Text className="font-body-semi text-ink mb-1">Sem mensagens ainda</Text>
                <Text className="text-muted text-sm text-center">Inicie a conversa abaixo.</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View className="flex-row gap-2 px-4 py-3 bg-white border-t border-earth-100">
          <TextInput
            className="flex-1 bg-surface border border-earth-100 rounded-btn px-4 py-2.5 text-ink text-sm max-h-24"
            value={input}
            onChangeText={setInput}
            placeholder="Escrever mensagem…"
            placeholderTextColor="#78716c"
            multiline
            editable={connected}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || !connected}
            className={`w-11 h-11 rounded-btn items-center justify-center ${
              input.trim() && connected ? 'bg-brand-500' : 'bg-earth-100'
            }`}
          >
            <Send size={18} color={input.trim() && connected ? 'white' : '#78716c'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
