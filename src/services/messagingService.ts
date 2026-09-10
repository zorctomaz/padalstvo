import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '../types';

/**
 * Messaging store for chats with registered boats. This first version persists
 * locally on-device with AsyncStorage and simulates delivery + occasional replies,
 * so the UI/UX can be built and tested end-to-end. Swapping in a real backend
 * (e.g. Firebase Firestore, or a boat-to-boat radio/satellite relay) later only
 * means reimplementing this module's functions with the same signatures.
 */

const STORAGE_KEY = 'burja:messages:v1';

type Listener = (boatId: string, messages: ChatMessage[]) => void;

let cache: Record<string, ChatMessage[]> | null = null;
const listeners = new Set<Listener>();

async function load(): Promise<Record<string, ChatMessage[]>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

async function persist() {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // best-effort local persistence; ignore quota/serialization errors
  }
}

function notify(boatId: string) {
  const messages = cache?.[boatId] ?? [];
  listeners.forEach((l) => l(boatId, messages));
}

export async function getMessages(boatId: string): Promise<ChatMessage[]> {
  const all = await load();
  return all[boatId] ?? [];
}

export function onMessagesChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const AUTO_REPLIES = [
  'Sprejeto, hvala za info!',
  'Razumem, se vidimo v marini.',
  'Trenutno imamo dober veter, se pridružite?',
  'Pozor, plitvina pred vami!',
  'Hvala, varno plovbo!',
  'Ok, ohranjamo razdaljo.',
];

export async function sendMessage(boatId: string, text: string): Promise<ChatMessage> {
  const all = await load();
  const list = all[boatId] ?? [];

  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    boatId,
    text,
    timestamp: new Date().toISOString(),
    fromMe: true,
    status: 'sending',
  };

  all[boatId] = [...list, message];
  cache = all;
  notify(boatId);
  await persist();

  // simulate network round-trip
  setTimeout(async () => {
    const current = (cache?.[boatId] ?? []).map((m) =>
      m.id === message.id ? { ...m, status: 'delivered' as const } : m,
    );
    cache = { ...(cache ?? {}), [boatId]: current };
    notify(boatId);
    await persist();

    // occasionally simulate the other boat replying, to make the chat feel real
    if (Math.random() < 0.5) {
      setTimeout(async () => {
        const reply: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          boatId,
          text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
          timestamp: new Date().toISOString(),
          fromMe: false,
          status: 'delivered',
        };
        const withReply = [...(cache?.[boatId] ?? []), reply];
        cache = { ...(cache ?? {}), [boatId]: withReply };
        notify(boatId);
        await persist();
      }, 1200 + Math.random() * 1800);
    }
  }, 500 + Math.random() * 700);

  return message;
}
