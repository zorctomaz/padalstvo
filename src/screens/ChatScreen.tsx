import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { aisProvider } from '../services/aisService';
import { getMessages, onMessagesChanged, sendMessage } from '../services/messagingService';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Boat, ChatMessage } from '../types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function ChatScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const navigation = useNavigation();
  const { boatId } = route.params;
  const [boat, setBoat] = useState<Boat | undefined>(() => aisProvider.getKnownBoat(boatId));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    navigation.setOptions({ title: boat?.name ?? 'Klepet' });
  }, [navigation, boat]);

  useEffect(() => {
    if (!boat) {
      const found = aisProvider.getKnownBoat(boatId);
      if (found) setBoat(found);
    }
  }, [boatId, boat]);

  useEffect(() => {
    getMessages(boatId).then(setMessages);
    return onMessagesChanged((id, msgs) => {
      if (id === boatId) setMessages(msgs);
    });
  }, [boatId]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await sendMessage(boatId, text);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {boat && (
        <View style={styles.subHeader}>
          <Text style={styles.subHeaderText}>
            MMSI {boat.mmsi} · {boat.speedKnots.toFixed(1)} vz · {Math.round(boat.heading)}°
          </Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.fromMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
            <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, item.fromMe && styles.bubbleTextMe]}>{item.text}</Text>
              <Text style={[styles.bubbleTime, item.fromMe && styles.bubbleTimeMe]}>
                {formatTime(item.timestamp)}
                {item.fromMe ? ` · ${statusLabel(item.status)}` : ''}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Še ni sporočil. Pošlji prvi pozdrav! ⚓️</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Napiši sporočilo..."
          placeholderTextColor={colors.mist}
          style={styles.input}
          multiline
          maxLength={500}
        />
        <Pressable style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]} onPress={onSend} disabled={!draft.trim()}>
          <Text style={styles.sendBtnText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function statusLabel(status: ChatMessage['status']): string {
  switch (status) {
    case 'sending':
      return 'pošiljanje...';
    case 'sent':
      return 'poslano';
    case 'delivered':
      return 'dostavljeno';
    case 'failed':
      return 'napaka';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.foam },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subHeaderText: { fontSize: 12, color: colors.slate },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMe: { backgroundColor: colors.sea, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: colors.ink },
  bubbleTextMe: { color: colors.white },
  bubbleTime: { fontSize: 10, color: colors.mist, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.75)' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: colors.slate, fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.foam,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.mist },
  sendBtnText: { color: colors.white, fontSize: 18, fontWeight: '700' },
});
