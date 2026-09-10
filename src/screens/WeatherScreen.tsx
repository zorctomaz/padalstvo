import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../components/Card';
import { CompassArrow } from '../components/CompassArrow';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSailorLocation } from '../hooks/useSailorLocation';
import {
  degreesToCompass,
  describeWeatherCode,
  fetchMarineWeather,
  knotsToBeaufort,
} from '../services/weatherService';
import { colors } from '../theme/colors';
import type { MarineWeather } from '../types';

function formatHour(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:00`;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const days = ['ned', 'pon', 'tor', 'sre', 'čet', 'pet', 'sob'];
  return days[d.getDay()];
}

export function WeatherScreen() {
  const { coordinates, isDefault, loading: locLoading, refresh: refreshLocation } = useSailorLocation();
  const [weather, setWeather] = useState<MarineWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMarineWeather(coordinates);
      setWeather(data);
    } catch (e) {
      setError('Vremenskih podatkov trenutno ni mogoče naložiti. Preveri internetno povezavo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coordinates]);

  useEffect(() => {
    if (!locLoading) {
      setLoading(true);
      load();
    }
  }, [locLoading, load]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshLocation();
    load();
  };

  if (loading || locLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Vreme" subtitle="Nalaganje..." />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.sea} />
        </View>
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Vreme" />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Ni podatkov.'}</Text>
        </View>
      </View>
    );
  }

  const { current, hourly, daily } = weather;
  const beaufort = knotsToBeaufort(current.windSpeedKn);
  const weatherInfo = describeWeatherCode(current.weatherCode);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Vreme"
        subtitle={`${weather.locationName}${isDefault ? ' · privzeta lokacija' : ''}`}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sea} />}
      >
        <Card style={styles.currentCard}>
          <View style={styles.currentTop}>
            <View>
              <Text style={styles.currentTemp}>{Math.round(current.temperatureC)}°C</Text>
              <Text style={styles.currentLabel}>
                {weatherInfo.icon} {weatherInfo.label}
              </Text>
            </View>
            <View style={styles.windBlock}>
              <CompassArrow directionDeg={current.windDirectionDeg} size={36} />
              <Text style={styles.windSpeed}>{Math.round(current.windSpeedKn)} vozlov</Text>
              <Text style={styles.windMeta}>
                {degreesToCompass(current.windDirectionDeg)} · Bf {beaufort}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Sunki vetra" value={`${Math.round(current.windGustsKn)} vz`} />
            <Stat label="Valovi" value={current.waveHeightM != null ? `${current.waveHeightM.toFixed(1)} m` : '–'} />
            <Stat label="Tlak" value={`${Math.round(current.pressureHpa)} hPa`} />
            <Stat
              label="Vidljivost"
              value={current.visibilityKm != null ? `${current.visibilityKm.toFixed(0)} km` : '–'}
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Naslednjih 24 ur</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
          {hourly.slice(0, 24).map((h) => {
            const info = describeWeatherCode(h.weatherCode);
            return (
              <Card key={h.time} style={styles.hourlyCard}>
                <Text style={styles.hourlyTime}>{formatHour(h.time)}</Text>
                <Text style={styles.hourlyIcon}>{info.icon}</Text>
                <Text style={styles.hourlyTemp}>{Math.round(h.temperatureC)}°</Text>
                <View style={styles.hourlyWindRow}>
                  <CompassArrow directionDeg={h.windDirectionDeg} size={14} color={colors.slate} />
                  <Text style={styles.hourlyWind}>{Math.round(h.windSpeedKn)} vz</Text>
                </View>
                {h.waveHeightM != null && <Text style={styles.hourlyWave}>🌊 {h.waveHeightM.toFixed(1)} m</Text>}
              </Card>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>7-dnevna napoved</Text>
        <Card style={styles.dailyCard}>
          {daily.map((d, i) => {
            const info = describeWeatherCode(d.weatherCode);
            return (
              <View key={d.date} style={[styles.dailyRow, i === daily.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.dailyDay}>{formatDay(d.date)}</Text>
                <Text style={styles.dailyIcon}>{info.icon}</Text>
                <View style={styles.dailyWind}>
                  <Text style={styles.dailyWindText}>💨 {Math.round(d.windSpeedMaxKn)} vz</Text>
                  {d.waveHeightMaxM != null && (
                    <Text style={styles.dailyWaveText}>🌊 {d.waveHeightMaxM.toFixed(1)} m</Text>
                  )}
                </View>
                <Text style={styles.dailyTemp}>
                  {Math.round(d.tempMaxC)}° / {Math.round(d.tempMinC)}°
                </Text>
              </View>
            );
          })}
        </Card>

        <Text style={styles.disclaimer}>
          Vir podatkov: Open-Meteo. Napoved je informativna in ne nadomešča uradnega vremenskega
          opozorila ali pomorskega biltena.
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.foam },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: colors.slate, textAlign: 'center', fontSize: 15 },
  content: { padding: 16, paddingBottom: 32 },
  currentCard: { marginBottom: 20 },
  currentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentTemp: { fontSize: 44, fontWeight: '800', color: colors.ink },
  currentLabel: { fontSize: 15, color: colors.slate, marginTop: 2 },
  windBlock: { alignItems: 'center' },
  windSpeed: { fontSize: 18, fontWeight: '700', color: colors.sea, marginTop: 4 },
  windMeta: { fontSize: 12, color: colors.slate },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.ink },
  statLabel: { fontSize: 11, color: colors.slate, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 10, marginTop: 4 },
  hourlyScroll: { marginBottom: 20 },
  hourlyCard: { width: 84, alignItems: 'center', marginRight: 10, paddingVertical: 12 },
  hourlyTime: { fontSize: 12, color: colors.slate, fontWeight: '600' },
  hourlyIcon: { fontSize: 20, marginVertical: 4 },
  hourlyTemp: { fontSize: 15, fontWeight: '700', color: colors.ink },
  hourlyWindRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 },
  hourlyWind: { fontSize: 11, color: colors.slate },
  hourlyWave: { fontSize: 10, color: colors.seaLight, marginTop: 2 },
  dailyCard: { paddingVertical: 4 },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  dailyDay: { width: 36, fontSize: 13, fontWeight: '700', color: colors.ink, textTransform: 'capitalize' },
  dailyIcon: { fontSize: 18, width: 26 },
  dailyWind: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  dailyWindText: { fontSize: 12, color: colors.slate },
  dailyWaveText: { fontSize: 12, color: colors.seaLight },
  dailyTemp: { fontSize: 13, fontWeight: '600', color: colors.ink },
  disclaimer: { fontSize: 11, color: colors.mist, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});
