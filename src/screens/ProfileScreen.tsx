import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { useOwnBoatProfile } from '../services/ownBoatStore';
import { colors } from '../theme/colors';
import type { BoatType } from '../types';

const TYPE_OPTIONS: { value: BoatType; label: string; icon: string }[] = [
  { value: 'sailboat', label: 'Jadrnica', icon: '⛵' },
  { value: 'motorboat', label: 'Motorni čoln', icon: '🚤' },
  { value: 'catamaran', label: 'Katamaran', icon: '🛶' },
  { value: 'fishing', label: 'Ribiška ladja', icon: '🎣' },
];

export function ProfileScreen() {
  const { profile, update } = useOwnBoatProfile();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Moja ladja" subtitle="Profil in nastavitve vidnosti" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.label}>Ime ladje</Text>
          <TextInput
            value={profile.name}
            onChangeText={(name) => update({ name })}
            placeholder="npr. Vesna"
            placeholderTextColor={colors.mist}
            style={styles.input}
          />

          <Text style={styles.label}>MMSI</Text>
          <TextInput
            value={profile.mmsi}
            onChangeText={(mmsi) => update({ mmsi })}
            placeholder="9-mestna številka"
            placeholderTextColor={colors.mist}
            keyboardType="number-pad"
            maxLength={9}
            style={styles.input}
          />

          <Text style={styles.label}>Klicni znak</Text>
          <TextInput
            value={profile.callSign}
            onChangeText={(callSign) => update({ callSign })}
            placeholder="npr. S5ABCD"
            placeholderTextColor={colors.mist}
            autoCapitalize="characters"
            style={styles.input}
          />

          <Text style={styles.label}>Tip plovila</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => {
              const active = profile.type === opt.value;
              return (
                <View
                  key={opt.value}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onTouchEnd={() => update({ type: opt.value })}
                >
                  <Text style={styles.typeIcon}>{opt.icon}</Text>
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{opt.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Prikaži na AIS zemljevidu</Text>
              <Text style={styles.switchSubtitle}>Drugi jadralci te bodo videli kot ladjo v bližini.</Text>
            </View>
            <Switch
              value={profile.isVisibleOnAis}
              onValueChange={(v) => update({ isVisibleOnAis: v })}
              trackColor={{ false: colors.border, true: colors.seaLight }}
            />
          </View>
          <View style={[styles.switchRow, { marginTop: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Sprejemaj sporočila</Text>
              <Text style={styles.switchSubtitle}>Prijavljene ladje ti bodo lahko pisale neposredno.</Text>
            </View>
            <Switch
              value={profile.isRegisteredForMessages}
              onValueChange={(v) => update({ isRegisteredForMessages: v })}
              trackColor={{ false: colors.border, true: colors.seaLight }}
            />
          </View>
        </Card>

        <Text style={styles.footnote}>
          To je prva različica aplikacije. Podatki o sosednjih ladjah so trenutno simulirani za namen
          testiranja — pravi AIS vir in strežnik za sporočila bosta dodana v naslednji fazi.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.foam },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  label: { fontSize: 12, fontWeight: '700', color: colors.slate, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.foam,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipActive: { backgroundColor: colors.sea, borderColor: colors.sea },
  typeIcon: { fontSize: 14 },
  typeLabel: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  typeLabelActive: { color: colors.white },
  switchCard: {},
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  switchSubtitle: { fontSize: 12, color: colors.slate, marginTop: 2 },
  footnote: { fontSize: 11, color: colors.mist, textAlign: 'center', lineHeight: 16 },
});
