import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { useSailorLocation } from '../hooks/useSailorLocation';
import { aisProvider, distanceNm } from '../services/aisService';
import { useOwnBoatProfile } from '../services/ownBoatStore';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Boat } from '../types';

const RADIUS_NM = 8;

const BOAT_TYPE_LABEL: Record<Boat['type'], string> = {
  sailboat: 'Jadrnica',
  motorboat: 'Motorni čoln',
  catamaran: 'Katamaran',
  cargo: 'Tovorna ladja',
  fishing: 'Ribiška ladja',
  passenger: 'Potniška ladja',
};

const BOAT_TYPE_ICON: Record<Boat['type'], string> = {
  sailboat: '⛵',
  motorboat: '🚤',
  catamaran: '🛶',
  cargo: '🚢',
  fishing: '🎣',
  passenger: '🛳️',
};

export function AisMapScreen() {
  const { coordinates, loading: locLoading } = useSailorLocation();
  const { profile } = useOwnBoatProfile();
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selected, setSelected] = useState<Boat | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (locLoading) return;
    const unsubscribe = aisProvider.subscribe(coordinates, RADIUS_NM, setBoats);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locLoading, coordinates.latitude, coordinates.longitude]);

  const sortedBoats = useMemo(
    () =>
      [...boats].sort((a, b) => distanceNm(coordinates, a.coordinates) - distanceNm(coordinates, b.coordinates)),
    [boats, coordinates],
  );

  const openChat = (boat: Boat) => {
    setSelected(null);
    navigation.navigate('Chat', { boatId: boat.id });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Sosednje ladje"
        subtitle={`${boats.length} ladij v bližini · ${RADIUS_NM} Nm`}
        right={
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleBtn, view === 'map' && styles.toggleBtnActive]}
              onPress={() => setView('map')}
            >
              <Text style={[styles.toggleText, view === 'map' && styles.toggleTextActive]}>Zemljevid</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, view === 'list' && styles.toggleBtnActive]}
              onPress={() => setView('list')}
            >
              <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>Seznam</Text>
            </Pressable>
          </View>
        }
      />

      {view === 'map' ? (
        <View style={{ flex: 1 }}>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              latitudeDelta: 0.12,
              longitudeDelta: 0.12,
            }}
            onPress={() => setSelected(null)}
          >
            <Marker
              coordinate={coordinates}
              title={profile.name || 'Moja ladja'}
              pinColor={colors.ownBoat}
              tracksViewChanges={false}
            />
            {boats.map((boat) => (
              <Marker
                key={boat.id}
                coordinate={boat.coordinates}
                pinColor={boat.isRegisteredForMessages ? colors.registeredBoat : colors.otherBoat}
                onPress={() => setSelected(boat)}
                tracksViewChanges={false}
              >
              </Marker>
            ))}
          </MapView>

          {selected && (
            <BoatDetailPanel
              boat={selected}
              distance={distanceNm(coordinates, selected.coordinates)}
              onClose={() => setSelected(null)}
              onMessage={() => openChat(selected)}
            />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {sortedBoats.map((boat) => (
            <Pressable key={boat.id} onPress={() => setSelected(boat)}>
              <Card style={styles.listCard}>
                <BoatRow boat={boat} distance={distanceNm(coordinates, boat.coordinates)} />
              </Card>
            </Pressable>
          ))}
          {selected && (
            <BoatDetailPanel
              boat={selected}
              distance={distanceNm(coordinates, selected.coordinates)}
              onClose={() => setSelected(null)}
              onMessage={() => openChat(selected)}
              inline
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function BoatRow({ boat, distance }: { boat: Boat; distance: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{BOAT_TYPE_ICON[boat.type]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{boat.name}</Text>
        <Text style={styles.rowMeta}>
          {BOAT_TYPE_LABEL[boat.type]} · {boat.speedKnots.toFixed(1)} vz · {Math.round(boat.heading)}°
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.rowDistance}>{distance.toFixed(1)} Nm</Text>
        {boat.isRegisteredForMessages && <Text style={styles.rowBadge}>✉️ dosegljiva</Text>}
      </View>
    </View>
  );
}

function BoatDetailPanel({
  boat,
  distance,
  onClose,
  onMessage,
  inline,
}: {
  boat: Boat;
  distance: number;
  onClose: () => void;
  onMessage: () => void;
  inline?: boolean;
}) {
  return (
    <Card style={[styles.detailPanel, inline ? styles.detailPanelInline : styles.detailPanelFloating]}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailIcon}>{BOAT_TYPE_ICON[boat.type]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailName}>{boat.name}</Text>
          <Text style={styles.detailMeta}>
            {BOAT_TYPE_LABEL[boat.type]} · MMSI {boat.mmsi} {boat.callSign ? `· ${boat.callSign}` : ''}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={styles.closeX}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.detailStats}>
        <DetailStat label="Razdalja" value={`${distance.toFixed(1)} Nm`} />
        <DetailStat label="Hitrost" value={`${boat.speedKnots.toFixed(1)} vz`} />
        <DetailStat label="Smer" value={`${Math.round(boat.heading)}°`} />
        {boat.lengthMeters && <DetailStat label="Dolžina" value={`${boat.lengthMeters} m`} />}
      </View>

      {boat.isRegisteredForMessages ? (
        <Pressable style={styles.messageBtn} onPress={onMessage}>
          <Text style={styles.messageBtnText}>✉️  Pošlji sporočilo</Text>
        </Pressable>
      ) : (
        <Text style={styles.notRegistered}>Ta ladja ni prijavljena za prejemanje sporočil.</Text>
      )}
    </Card>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailStat}>
      <Text style={styles.detailStatValue}>{value}</Text>
      <Text style={styles.detailStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.foam },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: colors.white },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.white },
  toggleTextActive: { color: colors.deepSea },
  listContent: { padding: 16, gap: 10 },
  listCard: { paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { fontSize: 26, width: 32, textAlign: 'center' },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowMeta: { fontSize: 12, color: colors.slate, marginTop: 2 },
  rowDistance: { fontSize: 13, fontWeight: '700', color: colors.sea },
  rowBadge: { fontSize: 10, color: colors.success, marginTop: 2 },
  detailPanel: { position: 'absolute', left: 12, right: 12 },
  detailPanelFloating: { bottom: 16 },
  detailPanelInline: { position: 'relative', left: 0, right: 0, marginTop: 4 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { fontSize: 30 },
  detailName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  detailMeta: { fontSize: 12, color: colors.slate, marginTop: 2 },
  closeX: { fontSize: 18, color: colors.mist, padding: 4 },
  detailStats: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 18,
  },
  detailStat: { alignItems: 'flex-start' },
  detailStatValue: { fontSize: 14, fontWeight: '700', color: colors.ink },
  detailStatLabel: { fontSize: 10, color: colors.slate, marginTop: 1 },
  messageBtn: {
    marginTop: 14,
    backgroundColor: colors.sea,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  messageBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  notRegistered: { marginTop: 12, fontSize: 12, color: colors.mist, fontStyle: 'italic' },
});
