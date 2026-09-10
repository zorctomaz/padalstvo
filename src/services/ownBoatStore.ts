import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { BoatType } from '../types';

export interface OwnBoatProfile {
  name: string;
  mmsi: string;
  callSign: string;
  type: BoatType;
  isVisibleOnAis: boolean;
  isRegisteredForMessages: boolean;
}

const STORAGE_KEY = 'burja:ownBoat:v1';

const DEFAULT_PROFILE: OwnBoatProfile = {
  name: '',
  mmsi: '',
  callSign: '',
  type: 'sailboat',
  isVisibleOnAis: true,
  isRegisteredForMessages: true,
};

let cache: OwnBoatProfile | null = null;
const listeners = new Set<(profile: OwnBoatProfile) => void>();

async function load(): Promise<OwnBoatProfile> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    cache = DEFAULT_PROFILE;
  }
  return cache!;
}

async function save(profile: OwnBoatProfile) {
  cache = profile;
  listeners.forEach((l) => l(profile));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // best-effort
  }
}

export function useOwnBoatProfile() {
  const [profile, setProfile] = useState<OwnBoatProfile>(cache ?? DEFAULT_PROFILE);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    load().then((p) => {
      if (mounted) {
        setProfile(p);
        setLoading(false);
      }
    });
    const listener = (p: OwnBoatProfile) => setProfile(p);
    listeners.add(listener);
    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  const update = async (patch: Partial<OwnBoatProfile>) => {
    const current = await load();
    const next = { ...current, ...patch };
    await save(next);
  };

  return { profile, loading, update };
}
