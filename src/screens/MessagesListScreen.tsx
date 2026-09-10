import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSailorLocation } from '../hooks/useSailorLocation';
import { aisProvider, distanceNm } from '../services/aisService';
import { getMessages, onMessagesChanged } from '../services/messagingService';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Boat, ChatMessage } from '../types';

const RADIUS_NM = 8;

export function MessagesListScreen() {
  const { coordinates, loading: locLoading } = useSailorLocation();
  const [boats, setBoats] = useState<Boat[]>([]);
  const [lastByBoat, setLastByBoat] = useState<Record<string, ChatMessage | undefined>>({});
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (locLoading) return;
    const unsubscribe = aisProvider.subscribe(coordinates, RADIUS_NM, setBoats);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locLoading, coordinates.latitude, coordinates.longitude]);

  useEffect(() => {
    const registeredIds = boats.filter((b) => b.isRegisteredForMessages).map((b) => b.id);
    Promise.all(registeredIds.map((id) => getMessages(id))).then((lists) => {
      setLastByBoat((prev) => {
        const next = { ...prev };
        registeredIds.forEach((id, i) => {
          const list = lists[i];
          next[id] = list[list.length - 1];
        });
        return next;
      });
    });

    const unsubscribe = onMessagesChanged((boatId, messages) => {
      setLastByBoat((prev) => ({ ...prev, [boatId]: messages[messages.length - 1] }));
    });
    return unsubscribe;
  }, [boats]);

  const conversations = useMemo(() => {
    return boats
      .filter((b) => b.isRegisteredForMessages)
      .map((boat) => ({ boat, last: lastByBoat[boat.id], distance: distanceNm(coordinates, boat.coordinates) }))
      .sort((a, b) => {
        const aTime = a.last ? new Date(a.last.timestamp).getTime() : 0;
        const bTime = b.last ? new Date(b.last.timestamp).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.distance - b.distance;
      });
  }, [boats, lastByBoat, coordinates]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Sporočila" subtitle="Prijavljene ladje v bližini" />
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✉️</Text>
          <Text style={styles.emptyTitle}>Trenutno ni prijavljenih ladij</Text>
          <Text style={styles.emptyText}>
            Ko bo v bližini ladja, ki je omogočila sporočila, se bo prikazala tukaj — odpri zavihek
            "Sosednje ladje", da jih vidiš na zemljevidu.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.boat.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('Chat', { boatId: item.boat.id })}>
              <Card style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.boat.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name}>{item.boat.name}</Text>
                    <Text style={styles.distance}>{item.distance.toFixed(1)} Nm</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.preview}>
                    {item.last ? (item.last.fromMe ? `Ti: ${item.last.text}` : item.last.text) : 'Ni še sporočil — reci pozdrav 👋'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.foam },
  list: { padding: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  distance: { fontSize: 12, color: colors.slate },
  preview: { fontSize: 13, color: colors.slate, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: 'center', lineHeight: 19 },
});
